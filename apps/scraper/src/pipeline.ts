import { getClient, mapCategory, mapSource, nowIso, withTx, recordSourceError, clearSourceErrors } from "@hoichoi/db";
import { newResolver } from "@hoichoi/llm";
import type {
  CategorySlug,
  LLMProviderRow,
  PostStatus,
  Source,
} from "@hoichoi/shared-types";
import { buildProvider } from "@hoichoi/llm";
import { checkAndArchive } from "./archive";
import { checkDedup } from "./dedup";
import { isExactDuplicate } from "./dedup";
import { scrapePage, type ScrapedPost } from "./facebook";
import { imagePhash } from "./hash";
import { isVideoUrl, mediaRoot, processImage, randomMediaName } from "./media";
import { mirrorMediaFile } from "./media-backfill";
import { processVideo } from "./video";
import { makeSlug, rewritePost } from "./rewrite";
import { captureScreenshot } from "./screenshot";
import { classifyContent } from "./classify";
import { uploadRemote } from "./storage";

/** Shared fetch options for CDN media: some providers 403 on the bare Node
 *  user-agent, so present a normal browser UA + image accept header. */
/**
 * Per-request init for origin media fetches.
 *
 * This is a factory, not a shared constant, because `AbortSignal.timeout()`
 * starts counting the moment the signal object is created. Held as a
 * module-level `const`, the single signal was built at import time and had
 * already expired by the time the pipeline reached its first image — every
 * media and pHash fetch then failed instantly with "The operation was aborted
 * due to timeout", and because both call sites swallow the error, posts were
 * published with `media_kind = 'none'` and no image, silently.
 *
 * A fresh signal per call restores the actual 20s budget.
 */
function mediaFetchInit(timeoutMs = 20_000): RequestInit {
  return {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
  };
}

export interface PipelineOptions {
  mock?: boolean;
  maxSources?: number;
  maxPosts?: number;
  evidence?: boolean;
  log?: (msg: string) => void;
}

export interface PipelineStats {
  sources: number;
  scraped: number;
  rawInserted: number;
  rewritten: number;
  duplicatesBlocked: number;
  /** Posts rejected because the rewrite was unusable (no title, no body, …). */
  skipped: number;
  /**
   * Posts with no scraped caption.
   *
   * This used to be a bare `continue` with no counter, which made a run where
   * every post had empty text look identical to a run that had nothing to do:
   * `rewritten: 0`, `skipped: 0`, no errors. The post was already inserted into
   * `raw_posts`, so the row count grew while the site published nothing and
   * nothing in the run explained why.
   *
   * Caption-less posts that carry an image are now saved and held for review,
   * so this counter means "posted to the desk without a caption"; anything
   * counted here with no image was discarded entirely.
   */
  emptyText: number;
  published: number;
  pendingReview: number;
  /** Posts held because the classifier's confidence fell under the fact-gate. */
  lowConfidence: number;
  providerUsed: string[] | null;
  errors: string[];
}

/**
 * Titles that a model emits when it could not write one. Stored as literal
 * headlines they look like real content while carrying no information.
 */
const PLACEHOLDER_TITLES = new Set([
  "শিরোনাম ছাড়া",
  "শিরোনাম নেই",
  "শিরোনাম",
  "শিরোনামহীন",
  "শিরোনাম দেওয়া হয়নি",
  "শিরোনাম পাওয়া যায়নি",
  "untitled",
  "no title",
  "n/a",
  "na",
  "-",
  "—",
  "…",
]);

/**
 * Reject rewrite output that must not reach the database.
 *
 * Returns a short reason for the log, or null when the post is publishable.
 * The checks are deliberately cheap and string-based: an empty or placeholder
 * title is a hard reject, and a body too short to be an article is a reject
 * too, because such a post can only ever be noise in the queue.
 */
export function unusableReason(rewritten: {
  title_bn: string;
  body_bn: string;
  summary_bn?: string;
}): string | null {
  const title = (rewritten.title_bn ?? "").trim();
  const body = (rewritten.body_bn ?? "").trim();

  if (!title) return "no title";
  // Compare on a normalised form so "শিরোনাম ছাড়া" and "শিরোনাম   ছাড়া" both hit.
  const flat = title.replace(/[\s।।,.:!?"'“”‘’()\[\]-]+/g, "").toLowerCase();
  if (PLACEHOLDER_TITLES.has(flat) || flat.length < 4) {
    return `placeholder title (${JSON.stringify(title.slice(0, 40))})`;
  }
  // A title that is only punctuation/quotes carries no information.
  if (!/\p{L}/u.test(title)) return "title has no letters";

  if (!body) return "no body";
  // 40 Bangla/word characters is well under the shortest acceptable briefing,
  // and filters out the single-line echoes models return on a failed rewrite.
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length < 25) return `body too short (${words.length} words)`;

  return null;
}

/**
 * Pick the category config used to rewrite a source's posts.
 * Prefers the source's primary category, then any of its multi-categories, then
 * any config available in the DB — so a source added against a category that is
 * not present in this database still produces content instead of erroring out.
 * The last-resort fallback skips `auto_pending_review` configs: a source whose
 * category is missing here then auto-publishes instead of silently parking
 * every post in the moderation queue.
 */
function resolveCategoryConfig(
  source: Pick<Source, "category" | "categories">,
  cats: Map<CategorySlug, ReturnType<typeof mapCategory>>,
): ReturnType<typeof mapCategory> | null {
  const primary = cats.get(source.category);
  if (primary) return primary;
  for (const slug of source.categories ?? []) {
    const c = cats.get(slug);
    if (c) return c;
  }
  for (const c of cats.values()) {
    if (!c.config.auto_pending_review) return c;
  }
  for (const c of cats.values()) return c;
  return null;
}

/**
 * Risk tier for a rewritten post.
 *
 * The previous rule was all-or-nothing: any category with `auto_pending_review`
 * or `requires_double_approval` sent every post to the queue, so a page
 * publishing hundreds of routine notices a day created hundreds of manual
 * reviews while the genuinely dangerous material got no extra scrutiny beyond
 * sitting in the same queue as everything else.
 *
 * Tiers, highest first:
 *   critical     two-person approval required, never auto-published
 *   sensitive    manual review before publishing
 *   routine      publishes on its own
 *
 * A critical or sensitive tier always overrides the category defaults, so
 * loosening a category's config can never let a minor-involved post through
 * unattended.
 */
export type RiskTier = "critical" | "sensitive" | "routine";

const CRITICAL_FLAGS = new Set([
  "minor_involved",
  "graphic_content",
  "needs_double_approval",
]);

const SENSITIVE_FLAGS = new Set(["unverified_claim"]);

export function assessRisk(
  config: { auto_pending_review: boolean; requires_double_approval: boolean },
  flags: readonly string[],
): { tier: RiskTier; status: PostStatus } {
  if (flags.some((f) => CRITICAL_FLAGS.has(f))) {
    return { tier: "critical", status: "pending_review" };
  }
  if (flags.some((f) => SENSITIVE_FLAGS.has(f))) {
    return { tier: "sensitive", status: "pending_review" };
  }
  if (config.requires_double_approval) {
    return { tier: "critical", status: "pending_review" };
  }
  if (config.auto_pending_review) {
    return { tier: "sensitive", status: "pending_review" };
  }
  return { tier: "routine", status: "published" };
}

export async function runPipeline(opts: PipelineOptions = {}): Promise<PipelineStats> {  const log = opts.log ?? ((s: string) => console.log(s));
  const client = getClient();
  const resolver = newResolver();
  const runId = crypto.randomUUID();
  const started = nowIso();
  const stats: PipelineStats = {
    sources: 0,
    scraped: 0,
    rawInserted: 0,
    rewritten: 0,
    duplicatesBlocked: 0,
    skipped: 0,
    emptyText: 0,
    published: 0,
    pendingReview: 0,
    lowConfidence: 0,
    providerUsed: [],
    errors: [],
  };

  // Run log
  await client.execute({
    sql: "INSERT INTO pipeline_runs (id, started_at, status) VALUES (?, ?, 'running')",
    args: [runId, started],
  });

  // Settings
  const catRes = await client.execute("SELECT * FROM category_configs ORDER BY sort_order");
  const cats = new Map<CategorySlug, ReturnType<typeof mapCategory>>();
  for (const r of catRes.rows) {
    const c = mapCategory(r as Record<string, unknown>);
    cats.set(c.slug, c);
  }
  const setRes = await client.execute("SELECT * FROM settings WHERE id = 1");
  const setRow = (setRes.rows[0] ?? {}) as Record<string, unknown>;
  // Clamp before use so a hand-edited or absent column degrades to the
  // historical 0.3 instead of failing every rewrite.
  const rewriteTemperature = Math.min(1, Math.max(0, Number(setRow.llm_temperature ?? 0.3)));
  // Fact-gate threshold as a whole percent, defaulting to the historical 90.
  const factGate = Math.min(100, Math.max(0, Number(setRow.fact_gate ?? 90)));

  // Sources
  const srcRes = await client.execute(
    "SELECT * FROM sources WHERE is_active = 1 ORDER BY last_scraped_at IS NULL DESC, last_scraped_at ASC",
  );
  const sources = srcRes.rows
    .map((r) => mapSource(r as Record<string, unknown>))
    .slice(0, opts.maxSources ?? 30);

  // Multi-category membership (source_categories) — feeds the config fallback
  // and keeps the source's own category list accurate for the rewrite step.
  try {
    const scRes = await client.execute("SELECT source_id, category_slug FROM source_categories");
    const scMap = new Map<string, CategorySlug[]>();
    for (const r of scRes.rows) {
      const row = r as Record<string, unknown>;
      const sid = String(row.source_id);
      const list = scMap.get(sid) ?? [];
      list.push(String(row.category_slug));
      scMap.set(sid, list);
    }
    for (const s of sources) s.categories = scMap.get(s.id) ?? [s.category];
  } catch {
    for (const s of sources) s.categories = [s.category];
  }

  // Session cookie for logged-in FB scraping (optional)
  const sessionCookie = process.env.FB_SESSION_COOKIE ?? null;

  for (const source of sources) {
    stats.sources++;
    log(`\n[scrape] ${source.page_name} (${source.category})`);
    let scraped: ScrapedPost[];
    try {
      scraped = await scrapePage(source, {
        sessionCookie,
        maxPosts: opts.maxPosts ?? 200,
        mock: opts.mock,
        requestDelayMs: 3000,
        log,
      });
    } catch (err) {
      const msg = `[scrape] ${source.page_name}: ${(err as Error).message}`;
      log(msg);
      stats.errors.push(msg);
      await recordSourceError(source.id, "scrape", (err as Error).message).catch(() => undefined);
      continue;
    }

    for (const sp of scraped) {
      stats.scraped++;
      // STEP 1: raw insert attempt (URL-level dedup first).
      if (await isExactDuplicate(sp.fbPostUrl)) continue;
      const rawId = crypto.randomUUID();
      const mediaUrls = JSON.stringify(sp.mediaUrls ?? []);
      try {
        await client.execute({
          sql: `
            INSERT INTO raw_posts (id, source_id, fb_post_id, fb_post_url, raw_text, media_urls, scraped_at, raw_meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (source_id, fb_post_id) DO NOTHING
          `,
          args: [rawId, source.id, sp.fbPostId, sp.fbPostUrl, sp.rawText, mediaUrls, nowIso(), JSON.stringify({
            video: sp.fbMediaIsVideo,
            author_name: sp.authorName ?? null,
            author_url: sp.authorProfileUrl ?? null,
          })],
        });
        stats.rawInserted++;
      } catch {
        continue; // UNIQUE conflict from concurrent run
      }

      // STEP 2: media handling (best-effort, never fatal). Tries every candidate
      // URL scraped from the post — the video first for a video post, then any
      // photos — so a failed video or 403'd image falls through to the next one.
      const media: { kind: "image" | "video" | "none"; path: string | null } = { kind: "none", path: null };
      try {
        const candidates = sp.mediaUrls ?? [];
        for (const mUrl of candidates) {
          try {
            if (isVideoUrl(mUrl)) {
              const result = await processVideo({
                inputUrl: mUrl,
                stampText: new Date().toLocaleString("bn-BD", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                log,
              });
              if (result) {
                await client.execute({
                  sql: "UPDATE raw_posts SET raw_meta = json_set(COALESCE(raw_meta,'{}'), '$.media_path', ?) WHERE id = ?",
                  args: [result.rel, rawId],
                });
                media.kind = "video";
                media.path = result.rel;
                break;
              }
            } else {
              const rel = randomMediaName("img", "webp");
              const bufRes = await fetch(mUrl, mediaFetchInit());
              if (bufRes.ok && bufRes.headers.get("content-length") !== "0") {
                const buf = Buffer.from(await bufRes.arrayBuffer());
                if (buf.length >= 1024) {
                  await processImage(buf, rel, { maxWidthPx: 1280 });
                  await client.execute({
                    sql: "UPDATE raw_posts SET raw_meta = json_set(COALESCE(raw_meta,'{}'), '$.media_path', ?) WHERE id = ?",
                    args: [rel, rawId],
                  });
                  media.kind = "image";
                  media.path = rel;
                  break;
                }
              }
            }
          } catch {
            // keep trying the next candidate
          }
        }
        // Push to remote storage when configured so the deployed web app can
        // serve the file (serverless can't reach this machine's disk). When no
        // adapter is configured the local copy stays in media_path, so mirror
        // it into the web app's public folder as well - that folder is what the
        // deployed site actually serves.
        if (media.path && !/^https?:\/\//.test(media.path)) {
          const pub = await uploadRemote(media.path);
          if (pub) {
            media.path = pub;
            log(`[media] uploaded → ${pub}`);
          } else {
            const mirrored = mirrorMediaFile(media.path);
            if (mirrored.length > 0) log(`[media] mirrored → ${mirrored[0]}`);
          }
        }
      } catch (err) {
        log(`[media] skip: ${(err as Error).message}`);
      }

      // STEP 3: screenshot evidence (optional, one browser per post — slow).
      if (opts.evidence) {
        const rel = randomMediaName("shot", "png");
        const shot = await captureScreenshot({
          url: sp.fbPostUrl,
          outPath: `${mediaRoot()}/${rel}`,
          log,
        });
        if (shot) {
          await client.execute({
            sql: "UPDATE raw_posts SET screenshot_path = ? WHERE id = ?",
            args: [rel, rawId],
          });
        }
      }

      // STEP 4: pHash (IMG-1) — historical + current.
      let phash: string | null = null;
      try {
        const firstMedia = sp.mediaUrls?.[0];
        if (firstMedia && !isVideoUrl(firstMedia)) {
          const bufRes = await fetch(firstMedia, mediaFetchInit());
          if (bufRes.ok) {
            phash = await imagePhash(Buffer.from(await bufRes.arrayBuffer()));
            if (phash) {
              await client.execute({
                sql: "UPDATE raw_posts SET phash = ? WHERE id = ?",
                args: [phash, rawId],
              });
            }
          }
        }
      } catch (err) {
        log(`[hash] skip: ${(err as Error).message}`);
      }

      // STEP 5: rewrite + embedding (only when we have text).
      // Facebook serves image- and link-only posts with no body text. Dropping
      // them threw the picture away even though STEP 3 had already mirrored it,
      // and the run still reported success — a source that starts returning
      // caption-less posts silently published nothing.
      //
      // A caption-less post is still saved, with its image, and held for review:
      // the media is real and should not be lost, but nothing may be invented
      // for the words. The desk operator writes the caption and releases it.
      // With neither text nor media there is genuinely nothing to keep.
      if (!sp.rawText) {
        if (!media.path) {
          stats.emptyText++;
          log(`[skip] no post text and no media — ${sp.fbPostUrl}`);
          continue;
        }
        const slug = makeSlug(`${source.page_name} photo ${sp.fbPostId}`);
        const now = nowIso();
        await client.execute({
          sql: `
            INSERT INTO posts (
              id, raw_post_id, source_id, category, title_bn, body_bn, summary_bn,
              media_path, media_kind, source_url, source_name, slug, status,
              safety_flags, embedding, case_status, original_author_name,
              published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            crypto.randomUUID(), rawId, source.id, source.category,
            `${source.page_name} — ছবি পোস্ট`, "", "",
            media.path, media.kind,
            sp.fbPostUrl, source.page_name, slug, "pending_review",
            "[]", null, null,
            sp.authorName ?? null, null, now, now,
          ],
        });
        stats.emptyText++;
        stats.pendingReview++;
        log(`[photo] held for review (no caption) · ${slug} · ${media.path}`);
        continue;
      }
      try {
        // Content-based re-detection: a source pinned to one category (e.g. the
        // CLI default "missing-children") may receive posts that clearly belong
        // elsewhere. Only override when the text strongly matches another slug.
        const detected = classifyContent(sp.rawText, [...cats.keys()], source.category);
        const postCategory: CategorySlug = detected?.slug ?? source.category;
        if (postCategory !== source.category) {
          log(
            `[classify] "${source.page_name}" → ${postCategory} (${detected!.confidence}% · ${detected!.matches.length} hits)`,
          );
        }
        // Resolve a category config for the source. A freshly added source may use
        // a category that does not exist in THIS database yet (e.g. a custom web
        // category on a desktop-local DB). Falling back keeps the source producing
        // content instead of silently failing every post with "no category config".
        const resolved = resolveCategoryConfig(source, cats);
        if (!resolved) throw new Error(`no category config — category_configs is empty`);
        // Prefer the detected post's own category config when it exists here;
        // otherwise the source's best-effort config (see resolveCategoryConfig).
        const config = (cats.get(postCategory) ?? resolved).config;

        // Fact-gate: a weak keyword match means the category assignment is a
        // guess. The desk has always exposed a threshold slider for exactly this,
        // and routing those posts to the moderation queue is what makes an
        // operator raising it see anything. The source's own category is treated
        // as authoritative, so an unrecognised post is not punished for the
        // source's configuration.
        const gateApplies = detected !== null && postCategory !== source.category;
        const lowConfidenceThisPost = gateApplies && detected.confidence < factGate;
        if (lowConfidenceThisPost) {
          log(
            `[gate] "${source.page_name}" → ${postCategory} @ ${detected.confidence}% below ${factGate}% — held for review`,
          );
          stats.lowConfidence++;
        }
        const outcome = await rewritePost({
          rawText: sp.rawText,
          sourceName: source.id,
          sourcePageName: source.page_name,
          category: postCategory,
          categoryConfig: config,
          originalAuthorName: sp.authorName ?? null,
          policeHelpline: String(setRow.police_helpline ?? "999"),
          childHelpline: String(setRow.child_helpline ?? "109"),
          temperature: rewriteTemperature,
          resolver,
          log,
        });

        // STEP 6: semantic + image dedup within this run's post set.
        const dup = await checkDedup({
          fbPostUrl: sp.fbPostUrl,
          rawText: sp.rawText,
          phash,
          vector: outcome.embedding,
          skipExact: true, // the exact URL was just inserted as raw_post
        });
        if (dup.duplicate) {
          log(`[dedup] blocked ${dup.reason} → ${dup.matchedPostId ?? dup.matchedRawId ?? "?"}`);
          stats.duplicatesBlocked++;
          continue;
        }

        // Reject unusable output BEFORE it reaches the database. A post with no
        // real title, a placeholder title, or an empty body is worse than no
        // post at all: it shows up in the queue and on the site as "শিরোনাম ছাড়া"
        // and costs a human to clean up.
        const unusable = unusableReason(outcome.rewritten);
        if (unusable) {
          log(`[skip] ${unusable} — ${sp.fbPostUrl}`);
          stats.skipped++;
          continue;
        }

        const decision = assessRisk(config, outcome.flags);
        // A weak category match escalates regardless of what the category or the
        // safety flags say: the content may be fine, but its placement on the
        // site is a guess, and a human should confirm it.
        const status: PostStatus = lowConfidenceThisPost ? "pending_review" : decision.status;
        const slug = makeSlug(outcome.rewritten.title_bn);
        const now = nowIso();
        await withTx(async (tx) => {
          const embeddingJson = outcome.embedding ? JSON.stringify(outcome.embedding) : null;
          await tx.execute({
            sql: `
              INSERT INTO posts (
                id, raw_post_id, source_id, category, title_bn, body_bn, summary_bn,
                media_path, media_kind, source_url, source_name, slug, status,
                safety_flags, embedding, case_status, original_author_name,
                published_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              crypto.randomUUID(), rawId, source.id, postCategory,
              outcome.rewritten.title_bn, outcome.rewritten.body_bn, outcome.rewritten.summary_bn,
              media.path, media.kind,
              sp.fbPostUrl, source.page_name, slug, status,
              JSON.stringify(outcome.flags), embeddingJson, outcome.rewritten.case_status ?? null,
              sp.authorName ?? null, status === "published" ? now : null, now, now,
            ],
          });
          // vec0 row (invisible for local DBs when the extension is missing → ignore).
          if (outcome.embedding) {
            await tx.execute({
              sql: "INSERT INTO posts_vec (post_id, embedding) VALUES (?, ?)",
              args: [slug, JSON.stringify(outcome.embedding)],
            }).catch(() => {});
          }
        });
        if (status === "published") stats.published++;
        else stats.pendingReview++;
        stats.rewritten++;
        const prov = outcome.provider;
        if (!stats.providerUsed!.includes(prov)) stats.providerUsed!.push(prov);
        log(`[post] ${status} · ${slug} · ${outcome.provider}`);
      } catch (err) {
        const msg = `[rewrite] ${source.page_name}: ${(err as Error).message}`;
        log(msg);
        stats.errors.push(msg);
      }
    }

    // Mark source scraped (successful pass clears its error inbox).
    await client.execute({
      sql: "UPDATE sources SET last_scraped_at = ? WHERE id = ?",
      args: [nowIso(), source.id],
    });
    await clearSourceErrors(source.id).catch(() => undefined);
  }

  // STEP 7: archive lifecycle (auto_rollover).
  try {
    await checkAndArchive(log);
  } catch (err) {
    log(`[archive] ${(err as Error).message}`);
  }

  const finished = nowIso();
  const finalStatus = stats.errors.length > 0 ? "failed" : "completed";
  await client.execute({
    sql: `
      UPDATE pipeline_runs
      SET finished_at = ?, status = ?, stats = ?, provider_used = ?, error = ?
      WHERE id = ?
    `,
    args: [
      finished,
      finalStatus,
      JSON.stringify({
        sources: stats.sources,
        scraped: stats.scraped,
        rawInserted: stats.rawInserted,
        rewritten: stats.rewritten,
        duplicatesBlocked: stats.duplicatesBlocked,
        skipped: stats.skipped,
        emptyText: stats.emptyText,
        published: stats.published,
        pendingReview: stats.pendingReview,
      }),
      stats.providerUsed!.join(","),
      stats.errors.slice(0, 5).join(" | "),
      runId,
    ],
  });

  log(`\n[done] ${JSON.stringify(stats, null, 2)}`);
  return stats;
}

export { buildProvider, type LLMProviderRow };
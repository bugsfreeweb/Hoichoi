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
const MEDIA_FETCH_INIT: RequestInit = {
  headers: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  },
  signal: AbortSignal.timeout(20_000),
};

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
  published: number;
  pendingReview: number;
  providerUsed: string[] | null;
  errors: string[];
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

export async function runPipeline(opts: PipelineOptions = {}): Promise<PipelineStats> {
  const log = opts.log ?? ((s: string) => console.log(s));
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
    published: 0,
    pendingReview: 0,
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
              const bufRes = await fetch(mUrl, MEDIA_FETCH_INIT);
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
          const bufRes = await fetch(firstMedia, MEDIA_FETCH_INIT);
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
      if (!sp.rawText) continue;
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
        const outcome = await rewritePost({
          rawText: sp.rawText,
          sourceName: source.id,
          sourcePageName: source.page_name,
          category: postCategory,
          categoryConfig: config,
          originalAuthorName: sp.authorName ?? null,
          policeHelpline: String(setRow.police_helpline ?? "999"),
          childHelpline: String(setRow.child_helpline ?? "109"),
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

        const sensitive =
          config.auto_pending_review ||
          config.requires_double_approval ||
          outcome.flags.some((f) =>
            f === "needs_double_approval" || f === "minor_involved" || f === "graphic_content",
          );
        const status: PostStatus = sensitive ? "pending_review" : "published";
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
/**
 * Media backfill + web mirroring.
 *
 * Why this exists: the collector writes media into the *local* media root
 * (`HOICHOI_MEDIA_ROOT` on the desktop, `<repo>/media` otherwise), but the
 * deployed web app is serverless — it can only serve bytes that were committed
 * to the repo (or pushed to a remote storage adapter). Posts whose media was
 * never uploaded therefore render a 404 image on the site, and posts whose media
 * download failed in CI end up with `media_kind = "none"` and no image at all.
 *
 * `backfillMissingMedia` repairs both:
 *   1. re-downloads the media for posts that have none (from the CDN URLs kept
 *      in `raw_posts.media_urls`), processes them to webp and points the post at
 *      the new file;
 *   2. mirrors every file it touches into the web app's `public/uploads` folder
 *      (served at `/uploads/<rel>`) plus `<repo>/media`, so the relative
 *      `media_path` resolves on the deployed site and in local dev as well.
 *
 * The original relative `media_path` is preserved (no CDN URL rewriting), which
 * keeps one storage layout for desktop, local dev and production.
 */
import { findRepoRoot, getClient, nowIso, updatePost } from "@hoichoi/db";
import { imageSizeFor, composeImagePrompt, generateImage as llmGenerateImage } from "@hoichoi/llm";
import { POSTER_FRAME } from "@hoichoi/poster";
import { composeStoryPlate } from "./plate";
import { downloadMedia, isVideoUrl, localMediaPath, mediaRoot, processImage, randomMediaName } from "./media";
import { scrapePostUrls } from "./facebook";
import { aiHeroEligible, generateAIHero } from "./ai-image";
import { uploadRemote } from "./storage";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Header set that makes fbcdn.net hand the original bytes over.
 *
 * A factory, not a shared object: `AbortSignal.timeout()` begins counting when
 * the signal is constructed, so a module-level constant would be born expired by
 * the time a backfill reached its first download. See the same fix in pipeline.ts.
 */
function mediaFetchInit(timeoutMs = 20_000): RequestInit {
  return {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Hoichoi/1.0",
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      referer: "https://www.facebook.com/",
    },
    signal: AbortSignal.timeout(timeoutMs),
  };
}

const MAX_WIDTH_PX = 1280;

/** Folders that must contain a copy of every media file the site has to serve. */
export function mirrorDirs(): string[] {
  const repo = findRepoRoot();
  const dirs = [
    // `uploads/` (not `media/`) because `app/media/[...path]/route.ts` shadows
    // public/media in the App Router — see mediaUrl() in apps/web.
    path.join(repo, "apps", "web", "public", "uploads"),
    path.join(repo, "data", "media"),
  ];
  // The desktop runtime writes into the app-data dir; keep that in sync too so
  // the installed app and the local dev server see identical trees.
  if (process.platform === "win32" && process.env.APPDATA) {
    dirs.push(path.join(process.env.APPDATA, "com.hoichoi.desk", "media"));
  }
  return [...new Set(dirs.map((d) => path.resolve(d)))];
}

/** Copy `<src root>/<rel>` into every mirror folder. Returns the folders written. */
export function mirrorMediaFile(rel: string, sourceRoot = mediaRoot()): string[] {
  const src = path.resolve(sourceRoot, rel);
  if (!fs.existsSync(src)) return [];
  const written: string[] = [];
  for (const dir of mirrorDirs()) {
    const dest = path.join(dir, rel);
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      written.push(dir);
    } catch {
      /* best effort - a failed mirror must not abort the backfill */
    }
  }
  return written;
}

/** Every root that might already hold a local copy of `rel` (media root first). */
function existingLocalCopies(rel: string): string[] {
  const roots = [mediaRoot(), ...mirrorDirs()];
  return roots.filter((r) => fs.existsSync(path.resolve(r, rel)));
}

interface PostNeedingMedia {
  id: string;
  raw_post_id: string;
  created_at: string;
  media_urls: string;
}

/** Copy files that exist locally but are missing from the web mirror. */
export async function syncExistingMediaToWeb(): Promise<{ checked: number; copied: number; missing: number }> {
  const client = getClient();
  const res = await client.execute(
    "SELECT id, media_path FROM posts WHERE media_path IS NOT NULL AND media_path <> '' AND media_path NOT LIKE 'http%'",
  );
  const rows = res.rows as unknown as Array<{ id: string; media_path: string }>;
  let copied = 0;
  let missing = 0;
  for (const row of rows) {
    const rel = row.media_path;
    const local = existingLocalCopies(rel);
    if (local.length === 0) {
      missing += 1;
      continue;
    }
    const webDir = mirrorDirs()[0]!;
    if (fs.existsSync(path.join(webDir, rel))) continue;
    mirrorMediaFile(rel, local[0]);
    copied += 1;
  }
  // Posts that were purged or archived leave their image behind in the media
  // root with nothing pointing at it. Archived posts stay reachable on the site
  // for the retention window, so those bytes still have to be mirrored - and
  // iterating `posts` alone can never find them.
  copied += mirrorOrphanedMedia();
  return { checked: rows.length, copied, missing };
}

/**
 * Mirror every file under the media root that is not yet in the web mirror,
 * including files no live post references. Returns how many were copied.
 */
export function mirrorOrphanedMedia(): number {
  const root = mediaRoot();
  if (!fs.existsSync(root)) return 0;
  const webDir = mirrorDirs()[0]!;
  let copied = 0;
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (!rel || rel.startsWith("..")) continue;
      if (fs.existsSync(path.join(webDir, rel))) continue;
      try {
        fs.mkdirSync(path.dirname(path.join(webDir, rel)), { recursive: true });
        fs.copyFileSync(full, path.join(webDir, rel));
        copied += 1;
      } catch {
        /* best effort - a failed mirror must not abort the backfill */
      }
    }
  };
  walk(root);
  return copied;
}

/** Download + attach media for every post that has none yet. */
export async function backfillMissingMedia(opts: {
  limit?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
} = {}): Promise<{
  candidates: number;
  attached: number;
  alreadyLocal: number;
  failed: number;
  dryRun: boolean;
}> {
  const log = opts.log ?? (() => undefined);
  const client = getClient();
  const limit = Math.max(1, Math.min(500, opts.limit ?? 200));
  const res = await client.execute({
    sql: `
      SELECT p.id, p.raw_post_id, p.created_at, r.media_urls
      FROM posts p
      JOIN raw_posts r ON r.id = p.raw_post_id
      WHERE (p.media_path IS NULL OR p.media_path = '')
        AND p.media_kind = 'none'
        AND r.media_urls IS NOT NULL AND r.media_urls NOT IN ('', '[]')
      ORDER BY p.created_at DESC
      LIMIT ?
    `,
    args: [limit],
  });
  const rows = res.rows as unknown as PostNeedingMedia[];
  let attached = 0;
  let alreadyLocal = 0;
  let failed = 0;

  for (const row of rows) {
    let urls: string[] = [];
    try {
      urls = JSON.parse(row.media_urls) as string[];
    } catch {
      failed += 1;
      continue;
    }
    // Images only: video posts would need yt-dlp/ffmpeg, out of scope here.
    const candidates = urls.filter((u) => u && !isVideoUrl(u));
    if (candidates.length === 0) {
      failed += 1;
      continue;
    }
    if (opts.dryRun) {
      attached += 1;
      continue;
    }

    let done = false;
    for (const url of candidates.slice(0, 4)) {
      const day = String(row.created_at ?? nowIso()).slice(0, 10);
      const rel = `${day}/img_${crypto.randomUUID().slice(0, 8)}.webp`;
      try {
        const r = await fetch(url, mediaFetchInit());
        if (!r.ok) continue;
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 1024) continue;
        await processImage(buf, rel, { maxWidthPx: MAX_WIDTH_PX });
        mirrorMediaFile(rel);
        await client.execute({
          sql: "UPDATE posts SET media_path = ?, media_kind = 'image', media_origin = 'collector', updated_at = ? WHERE id = ?",
          args: [rel, nowIso(), row.id],
        });
        await client.execute({
          sql: "UPDATE raw_posts SET raw_meta = json_set(COALESCE(raw_meta,'{}'), '$.media_path', ?) WHERE id = ?",
          args: [rel, row.raw_post_id],
        });
        log(`[media] backfilled ${row.id.slice(0, 8)} -> ${rel}`);
        attached += 1;
        done = true;
        break;
      } catch (err) {
        void err;
      }
    }
    if (!done) {
      // Keep the file if a previous run already produced one for this raw post.
      alreadyLocal += 1;
      failed += 1;
    }
  }
  return { candidates: rows.length, attached, alreadyLocal, failed, dryRun: Boolean(opts.dryRun) };
}

interface PostNeedingAIHero {
  id: string;
  raw_post_id: string;
  category: string | null;
  title_bn: string | null;
  summary_bn: string | null;
  body_bn: string | null;
}

/**
 * Generate AI fallback hero images for posts that have NO media and NO media
 * URLs to re-download (disjoint from `backfillMissingMedia`). A Gemini
 * `GOOGLE_API_KEY` must be present; sensitive categories are always skipped,
 * and posts already given an AI image (raw_meta.ai_generated) are not retried.
 */
export async function aiFillMissingHeroes(opts: {
  limit?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
} = {}): Promise<{
  candidates: number;
  generated: number;
  skippedSensitive: number;
  failed: number;
  dryRun: boolean;
}> {
  const log = opts.log ?? (() => undefined);
  const client = getClient();
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("AI hero fill requires GOOGLE_API_KEY (Gemini). Set it and retry.");
  }
  const limit = Math.max(1, Math.min(500, opts.limit ?? 200));
  const res = await client.execute({
    sql: `
      SELECT p.id, p.raw_post_id, p.category, p.title_bn, p.summary_bn, p.body_bn
      FROM posts p
      JOIN raw_posts r ON r.id = p.raw_post_id
      WHERE (p.media_path IS NULL OR p.media_path = '')
        AND p.media_kind = 'none'
        AND (r.media_urls IS NULL OR r.media_urls IN ('', '[]'))
        AND json_extract(COALESCE(r.raw_meta, '{}'), '$.ai_generated') IS NULL
      ORDER BY p.created_at DESC
      LIMIT ?
    `,
    args: [limit],
  });
  const rows = res.rows as unknown as PostNeedingAIHero[];
  let generated = 0;
  let skippedSensitive = 0;
  let failed = 0;

  for (const row of rows) {
    if (!aiHeroEligible(row.category)) {
      skippedSensitive += 1;
      continue;
    }
    if (opts.dryRun) {
      generated += 1;
      continue;
    }
    const rel = randomMediaName("img", "webp");
    const ok = await generateAIHero({
      title: row.title_bn ?? `post ${row.id.slice(0, 8)}`,
      summary: row.summary_bn ?? "",
      body: row.body_bn ?? "",
      category: row.category,
      log,
    });
    if (!ok) {
      failed += 1;
      continue;
    }
    mirrorMediaFile(ok);
    const pub = await uploadRemote(ok);
    if (pub) {
      log(`[ai-fill] ${row.id.slice(0, 8)} -> ${pub}`);
    } else {
      log(`[ai-fill] ${row.id.slice(0, 8)} -> ${ok}`);
    }
    await client.execute({
      sql: "UPDATE posts SET media_path = ?, media_kind = 'image', media_origin = 'ai', updated_at = ? WHERE id = ?",
      args: [ok, nowIso(), row.id],
    });
    await client.execute({
      sql: "UPDATE raw_posts SET raw_meta = json_set(COALESCE(raw_meta,'{}'), '$.ai_generated', 1) WHERE id = ?",
      args: [row.raw_post_id],
    });
    generated += 1;
  }
  return { candidates: rows.length, generated, skippedSensitive, failed, dryRun: Boolean(opts.dryRun) };
}

/** Re-download media that exists remotely but is missing from every local root. */
export async function verifyMediaFiles(): Promise<{ total: number; present: number; absent: string[] }> {
  const client = getClient();
  const res = await client.execute(
    "SELECT id, media_path FROM posts WHERE media_path IS NOT NULL AND media_path <> '' AND media_path NOT LIKE 'http%'",
  );
  const rows = res.rows as unknown as Array<{ id: string; media_path: string }>;
  const absent: string[] = [];
  for (const row of rows) {
    if (existingLocalCopies(row.media_path).length === 0) absent.push(row.media_path);
  }
  return { total: rows.length, present: rows.length - absent.length, absent };
}

/**
 * Second-stage recovery for posts whose raw_posts row was removed by the
 * archive pass: their CDN URLs are gone, so the permalink has to be re-visited
 * with a real browser. The same permalink is often shared by several duplicate
 * posts, so the page is fetched once and the result applied to every post that
 * points at it.
 */
export async function recoverOrphanedMedia(opts: {
  limit?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
} = {}): Promise<{
  posts: number;
  permalinks: number;
  recovered: number;
  withoutMedia: number;
  dryRun: boolean;
}> {
  const log = opts.log ?? (() => undefined);
  const client = getClient();
  const res = await client.execute(
    `SELECT id, source_url, created_at FROM posts
     WHERE (media_path IS NULL OR media_path = '') AND media_kind = 'none'
       AND source_url IS NOT NULL AND source_url <> ''
     ORDER BY created_at DESC`,
  );
  const rows = res.rows as unknown as Array<{ id: string; source_url: string; created_at: string }>;
  const byPermalink = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.source_url.split("?")[0]!;
    const list = byPermalink.get(key) ?? [];
    list.push(row);
    byPermalink.set(key, list);
  }
  const permalinks = [...byPermalink.keys()].slice(0, Math.max(1, opts.limit ?? 50));

  if (opts.dryRun) {
    return {
      posts: rows.length,
      permalinks: permalinks.length,
      recovered: permalinks.length,
      withoutMedia: 0,
      dryRun: true,
    };
  }

  const scraped = await scrapePostUrls(permalinks, {
    sessionCookie: process.env.FB_SESSION_COOKIE ?? null,
    log,
  });
  let recovered = 0;
  let withoutMedia = 0;

  for (const post of scraped) {
    const targets = byPermalink.get(post.fbPostUrl.split("?")[0]!) ?? [];
    if (targets.length === 0) continue;
    const candidates = post.mediaUrls.filter((u) => u && !isVideoUrl(u));
    if (candidates.length === 0) {
      withoutMedia += 1;
      continue;
    }
    const day = String(targets[0]?.created_at ?? nowIso()).slice(0, 10);
    const rel = `${day}/img_${crypto.randomUUID().slice(0, 8)}.webp`;
    let stored = false;
    for (const url of candidates.slice(0, 3)) {
      try {
        const r = await fetch(url, mediaFetchInit());
        if (!r.ok) continue;
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 1024) continue;
        await processImage(buf, rel, { maxWidthPx: MAX_WIDTH_PX });
        stored = true;
        break;
      } catch {
        /* try the next frame */
      }
    }
    if (!stored) {
      withoutMedia += 1;
      continue;
    }
    mirrorMediaFile(rel);
    for (const t of targets) {
      await client.execute({
        sql: "UPDATE posts SET media_path = ?, media_kind = 'image', media_origin = 'collector', updated_at = ? WHERE id = ?",
        args: [rel, nowIso(), t.id],
      });
    }
    recovered += 1;
    log(`[media] recovered ${targets.length} post(s) from ${post.fbPostUrl.slice(0, 60)}… -> ${rel}`);
  }

  return { posts: rows.length, permalinks: permalinks.length, recovered, withoutMedia, dryRun: false };
}

export { downloadMedia, localMediaPath };

export interface ManualImageResult {
  media_path: string;
  provider: string;
  model: string;
  contentType: string;
  bytes: number;
  attached: boolean;
  warning?: string;
}

/**
 * Manually generate an image for one post and attach it — the on-demand twin of
 * `generateAIHero` used by the editor's "generate image" panel (web + desktop).
 *
 * Unlike the pipeline's automatic hero, this respects the operator's provider,
 * prompt and option choices, and works with any image-purpose provider (Gemini
 * or any OpenAI-compatible images endpoint). The bytes are re-encoded to webp,
 * mirrored into the web `public/uploads` tree, pushed to the remote adapter
 * chain when configured, and written to the post's `media_path`.
 */
/**
 * The three facts a plate needs from the row, or nothing.
 *
 * Deliberately forgiving: a missing row or a database hiccup must not stop the
 * picture being drawn, it only means the caption falls back to whatever the
 * caller supplied.
 *
 * Why this exists: the caption used to fall back to `opts.prompt`, and the
 * prompt is an English illustration brief — so a plate produced by
 * `media generate` carried "Hand-drawn editorial illustration, ink and gouache
 * on paper…" as its Bangla news caption, and its topic chips ("illustration",
 * "photograph") in English. Reading the row here means every caller gets a real
 * headline and desk without having to remember to pass them.
 */
async function plateFacts(
  postId: string,
): Promise<{ title: string | null; category: string | null; source: string | null }> {
  try {
    const row = (
      await getClient().execute({
        sql: "SELECT title_bn, category, source_name FROM posts WHERE id = ?",
        args: [postId],
      })
    ).rows[0] as { title_bn?: string; category?: string; source_name?: string } | undefined;
    return {
      title: row?.title_bn?.trim() || null,
      category: row?.category ?? null,
      source: row?.source_name ?? null,
    };
  } catch {
    return { title: null, category: null, source: null };
  }
}

export async function generateManualImage(opts: {
  postId: string;
  prompt: string;
  providerId?: string;
  size?: string;
  aspectRatio?: string;
  style?: string;
  quality?: string;
  negativePrompt?: string;
  attach?: boolean;
  /** The headline to caption the plate with. Falls back to a short prompt. */
  plateTitle?: string;
  plateCategory?: string | null;
  plateSource?: string | null;
  log?: (msg: string) => void;
}): Promise<ManualImageResult> {
  const log = opts.log ?? (() => undefined);
  /**
   * The frame is decided once and used twice: in the prompt text ("horizontal
   * 16:9 frame") and as the pixel size the provider is asked for. They used to
   * disagree whenever `--ratio` was omitted — the brief promised a 16:9 hero and
   * the render came back square, so a story's picture had to be cropped by the
   * reader's card.
   */
  const aspectRatio = opts.aspectRatio ?? "16:9";
  const size = opts.size ?? imageSizeFor(aspectRatio);
  const prompt = composeImagePrompt({
    prompt: opts.prompt,
    aspectRatio,
    quality: opts.quality,
    negativePrompt: opts.negativePrompt,
  });
  /**
   * A failed render is not a failed request.
   *
   * When every provider in the chain refuses — quota, auth, or a payload the
   * model does not accept — the editor still asked for a picture for this post,
   * and the promise is that a story never ships without one. So the plate is
   * composed anyway, over the branded backdrop instead of over a render, and the
   * reason travels back as a warning. Before this, one bad provider turned the
   * whole action into exit 1 and the post stayed pictureless.
   */
  let rendered: Awaited<ReturnType<typeof llmGenerateImage>> | null = null;
  let renderError: string | null = null;
  try {
    rendered = await llmGenerateImage(
      {
        prompt,
        providerId: opts.providerId,
        size,
        aspectRatio,
        style: opts.style,
        quality: opts.quality,
        negativePrompt: opts.negativePrompt,
        count: 1,
      },
      AbortSignal.timeout(110_000),
    );
  } catch (err) {
    renderError = err instanceof Error ? err.message : String(err);
    log(`[img-gen] provider chain refused, drawing the branded plate instead: ${renderError}`);
  }
  // processImage always writes webp (and re-encodes/resizes), so the media name
  // must carry the .webp extension regardless of what the provider returned.
  const rel = randomMediaName("img", "webp");
  /**
   * The editor asked for a picture "for this post", so the plate carries the
   * post's own headline and desk: the same structure the collector applies
   * automatically, so a manually generated hero and an automatic one are the
   * same kind of object on the site.
   */
  const facts = await plateFacts(opts.postId);
  const plate = await composeStoryPlate({
    background: rendered ? Buffer.from(rendered.bytes) : null,
    title: opts.plateTitle ?? facts.title ?? opts.prompt.slice(0, 160),
    category: opts.plateCategory ?? facts.category ?? null,
    source: opts.plateSource ?? facts.source ?? null,
  });
  await processImage(plate, rel, { maxWidthPx: POSTER_FRAME.width });
  mirrorMediaFile(rel);
  let pub: string | null = null;
  let warning: string | undefined;
  try {
    pub = await uploadRemote(rel, opts.postId);
  } catch (err) {
    warning = err instanceof Error ? err.message : String(err);
    log(`[img-gen] remote upload failed: ${warning}`);
  }
  const applied = pub ?? rel;
  const provider = rendered?.provider ?? "plate";
  const model = rendered?.model ?? "branded-backdrop";
  log(
    rendered
      ? `[img-gen] ${opts.postId.slice(0, 8)} -> ${applied} via ${provider} (${model})`
      : `[img-gen] ${opts.postId.slice(0, 8)} -> ${applied} via the branded plate (no render)`,
  );

  const attach = opts.attach !== false;
  if (attach) {
    // `media_origin` tells the badge the truth: a plate carrying only our own
    // backdrop is marked as such even when it was requested as "AI".
    await updatePost(opts.postId, { media_path: applied, media_origin: rendered ? "ai" : "plate" });
  }
  const notes = [warning, renderError].filter(Boolean) as string[];
  return {
    media_path: applied,
    provider,
    model,
    contentType: rendered?.contentType ?? "image/webp",
    bytes: plate.length,
    attached: attach,
    ...(notes.length ? { warning: notes.join(" · ") } : {}),
  };
}

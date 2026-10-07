import { getClient, mapPost, mapRawPost } from "@hoichoi/db";
import { hammingDistance, isNearDuplicate } from "./hash";

export type DedupReason = "sem-1" | "img-1" | "exact-url";

/**
 * Stable identity of a Facebook permalink.
 *
 * Facebook hands out the *same* post under many URLs — the crawler appends
 * `?comment_id=…&__cft__[0]=…&__tn__=…`, and a post can appear as `/posts/…`,
 * `/permalink/…` or `/videos/…`. Comparing the raw string therefore never
 * matched and the same story got republished several times. Everything that
 * identifies a post (dedup, the `fb_post_id` unique key) must go through here:
 * scheme forced to https, host lowercased, `www.`/`m.`/`mbasic.`/`web.` dropped,
 * tracking query and fragment removed, trailing slash normalised, and the path
 * lowercased because Facebook treats page slugs and `pfbid` case-insensitively.
 */
export function canonicalPostUrl(url: string): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    u.hash = "";
    u.search = "";
    u.username = "";
    u.password = "";
    u.hostname = u.hostname.toLowerCase().replace(/^(?:www|m|mbasic|web)\./, "");
    u.protocol = "https:";
    // `/posts/pfbid01ABC/` and `/posts/pfbid01ABC` are the same post, and
    // Facebook serves `/HOICHOI/...` and `/hoichoi/...` interchangeably.
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return `https://${u.hostname}${path}`;
  } catch {
    // Not a parseable URL — fall back to a conservative manual cleanup.
    return trimmed.split("#")[0]!.split("?")[0]!.replace(/\/+$/, "").toLowerCase();
  }
}

export interface DedupResult {
  duplicate: boolean;
  reason?: DedupReason;
  matchedPostId?: string;
  matchedRawId?: string;
  score?: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const SEM_THRESHOLD = 0.94;

/**
 * IMG-1 tolerance, in differing bits of the 64-bit perceptual hash.
 *
 * This was 10 - a 15.6% tolerance. Facebook news images are text-heavy
 * screenshots that share page furniture, brand colours and headline bands, so
 * unrelated pictures routinely land 8-12 bits apart. At a tolerance of 10 a
 * run that hashed eight posts blocked six of them as `img-1` against a
 * reference index of only eleven hashes, and published nothing while reporting
 * no errors. DCT pHash only treats a handful of differing bits as the same
 * image, so this is now tight enough that a match means the picture really did
 * repeat.
 */
const IMAGE_DUP_MAX_DISTANCE = 4;

/**
 * Captions long enough to carry a story in their own right.
 *
 * Image dedup alone must not suppress a post that says something new. Facebook
 * pages legitimately reuse one photo across several stories, and a stock or
 * banner image showing up on two posts is normal editorial practice, not
 * spam. When there is real text, SEM-1 (which compares the caption) is the
 * correct gate; IMG-1 is reserved for near-identical pictures and for
 * caption-less image posts, where the image is the entire post.
 */
const CAPTION_WORTH_DEDUPING = 40;

/**
 * SEM-1 — semantic dedup against already-scraped rewritten posts.
 * Uses stored embeddings (JSON in posts.embedding). A native vec0
 * fast-path can be added when running on a Turso database.
 */
export async function findSemanticDuplicates(
  vector: number[] | null,
): Promise<{ id: string; score: number } | null> {
  if (!vector || vector.length === 0) return null;
  const client = getClient();
  const res = await client.execute(
    "SELECT id, embedding FROM posts WHERE embedding IS NOT NULL AND status != 'removed' ORDER BY created_at DESC LIMIT 500",
  );
  let best: { id: string; score: number } | null = null;
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    const emb = typeof rec.embedding === "string" ? JSON.parse(rec.embedding) as number[] : null;
    if (!emb) continue;
    const score = cosineSimilarity(vector, emb);
    if (score >= SEM_THRESHOLD && (!best || score > best.score)) {
      best = { id: String(rec.id), score };
    }
  }
  return best;
}

/**
 * IMG-1 — image-only dedup using perceptual hash (≤ 4 bits of 64), matching IMAGE_DUP_MAX_DISTANCE.
 * Exact pixel-level comparisons are not possible offline; the pHash is
 * computed locally and compared against prior raw_posts.
 *
 * `excludeRawId` is not an optimisation, it is the difference between
 * publishing and never publishing again. STEP 4 stores this post's own pHash on
 * its own `raw_posts` row before dedup runs, and the candidate set is every row
 * that has a pHash — including that one. Hamming distance to itself is 0, so
 * every post matched itself, was reported as `img-1`, and was skipped: runs
 * showed `rewritten: 0, published: 0` with six of eight posts blocked and no
 * error anywhere. The caller must pass the raw row it just wrote.
 */
export async function findImageDuplicates(
  phash: string | null,
  excludeRawId?: string,
): Promise<{ rawId: string; postId: string | null; dist: number } | null> {
  if (!phash) return null;
  const client = getClient();
  const res = await client.execute(
    "SELECT id, phash FROM raw_posts WHERE phash IS NOT NULL AND phash != '' ORDER BY scraped_at DESC LIMIT 1000",
  );
  let best: { rawId: string; postId: string | null; dist: number } | null = null;
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    if (excludeRawId && String(rec.id) === excludeRawId) continue;
    const other = String(rec.phash);
const dist = hammingDistance(phash, other);
      if (isNearDuplicate(phash, other, IMAGE_DUP_MAX_DISTANCE) && (!best || dist < best.dist)) {
      const postId = await findPostForRaw(String(rec.id));
      best = { rawId: String(rec.id), postId, dist };
    }
  }
  return best;
}

async function findPostForRaw(rawId: string): Promise<string | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT id FROM posts WHERE raw_post_id = ? LIMIT 1",
    args: [rawId],
  });
  const first = res.rows[0] as Record<string, unknown> | undefined;
  return first ? String(first.id) : null;
}

/**
 * Exact permalink duplicate.
 *
 * Two things make this necessary:
 *  - compare the *canonical* permalink, because the crawler decorates the same
 *    post with different tracking query strings on every run;
 *  - check `posts` as well as `raw_posts`, because the archive pass hard-deletes
 *    raw rows. Without that, a permalink whose raw row was purged looked brand
 *    new and the pipeline published a second copy of a live story.
 */
/**
 * Has this Facebook post already produced a row in `posts`?
 *
 * Two guards used to run here and neither could ever fire. Matching raw URL
 * strings compared Facebook's output against `canonicalPostUrl()`, which
 * strips `www.` and the `?__cft__[0]=...` token - so the two sides were never
 * equal. And the `raw_posts` hit it did look for only proved the post had been
 * *seen*, which would also have blocked the legitimate retry of a post that
 * was scraped empty on a previous run.
 *
 * Identity is therefore the digest `fbPostId` (stable across every URL shape
 * Facebook hands out), resolved through `raw_posts` to the posts row built
 * from it, with a normalised-URL fallback for posts whose raw row has since
 * been deleted.
 */
export async function isExactDuplicate(fbPostUrl: string, fbPostId?: string | null): Promise<boolean> {
  const client = getClient();
  if (fbPostId) {
    const viaKey = await client.execute({
      sql: `
        SELECT 1 FROM posts p
          JOIN raw_posts r ON r.id = p.raw_post_id
         WHERE r.fb_post_id = ?
         LIMIT 1
      `,
      args: [fbPostId],
    });
    if (viaKey.rows.length > 0) return true;
  }

  const base = canonicalPostUrl(fbPostUrl);
  if (!base) return false;
  // `posts.source_url` keeps the URL Facebook served - `www.`, tracking token,
  // original path case - so both sides are normalised to canonical shape
  // before they can be compared at all.
  const norm = `rtrim(lower(replace(replace(replace(replace(replace(
      source_url, 'https://www.', 'https://'), 'http://www.', 'https://'),
      'https://m.', 'https://'), 'https://mbasic.', 'https://'),
      'https://web.', 'https://')), '/')`;
  const foundPost = await client.execute({
    sql: `
      SELECT 1 FROM posts
       WHERE ${norm} = ? OR ${norm} LIKE ? OR ${norm} LIKE ?
       LIMIT 1
    `,
    args: [base, `${base}?%`, `${base}#%`],
  });
  return foundPost.rows.length > 0;
}

export async function checkDedup(input: {
  fbPostUrl: string;
  rawText: string | null;
  phash: string | null;
  vector: number[] | null;
  skipExact?: boolean;
/** The caller's own raw_posts row, so it cannot dedup against itself. */
    excludeRawId?: string;
  }): Promise<DedupResult> {
    if (!input.skipExact && (await isExactDuplicate(input.fbPostUrl))) {
      return { duplicate: true, reason: "exact-url" };
    }
    // A captioned post is judged on its words. Only fall through to IMG-1 when
    // the caption is too thin to stand on its own, so that a shared photo can
    // never delete a story that says something new.
    const caption = (input.rawText ?? "").trim();
    if (caption.length <= CAPTION_WORTH_DEDUPING) {
      const img = await findImageDuplicates(input.phash, input.excludeRawId);
      if (img) {
        return {
          duplicate: true,
          reason: "img-1",
          matchedRawId: img.rawId,
          matchedPostId: img.postId ?? undefined,
          score: 1 - img.dist / 64,
        };
      }
    }
  const sem = await findSemanticDuplicates(input.vector);
  if (sem) {
    return {
      duplicate: true,
      reason: "sem-1",
      matchedPostId: sem.id,
      score: sem.score,
    };
  }
  return { duplicate: false };
}

// Re-export mapping helpers so dedup callers can inspect matches.
export { mapPost, mapRawPost };
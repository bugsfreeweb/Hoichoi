import { getClient, mapPost, mapRawPost } from "@hoichoi/db";
import { hammingDistance, isNearDuplicate } from "./hash";

export type DedupReason = "sem-1" | "img-1" | "exact-url";

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
 * IMG-1 — image-only dedup using perceptual hash (≤ 10 bits of 64).
 * Exact pixel-level comparisons are not possible offline; the pHash is
 * computed locally and compared against prior raw_posts.
 */
export async function findImageDuplicates(
  phash: string | null,
): Promise<{ rawId: string; postId: string | null; dist: number } | null> {
  if (!phash) return null;
  const client = getClient();
  const res = await client.execute(
    "SELECT id, phash FROM raw_posts WHERE phash IS NOT NULL AND phash != '' ORDER BY scraped_at DESC LIMIT 1000",
  );
  let best: { rawId: string; postId: string | null; dist: number } | null = null;
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    const other = String(rec.phash);
    const dist = hammingDistance(phash, other);
    if (isNearDuplicate(phash, other) && (!best || dist < best.dist)) {
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

/** Exact URL / fb_post_id duplicate — the DB unique constraint also guards this. */
export async function isExactDuplicate(fbPostUrl: string): Promise<boolean> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT 1 FROM raw_posts WHERE fb_post_url = ? LIMIT 1",
    args: [fbPostUrl],
  });
  return res.rows.length > 0;
}

export async function checkDedup(input: {
  fbPostUrl: string;
  rawText: string | null;
  phash: string | null;
  vector: number[] | null;
  skipExact?: boolean;
}): Promise<DedupResult> {
  if (!input.skipExact && (await isExactDuplicate(input.fbPostUrl))) {
    return { duplicate: true, reason: "exact-url" };
  }
  const img = await findImageDuplicates(input.phash);
  if (img) {
    return {
      duplicate: true,
      reason: "img-1",
      matchedRawId: img.rawId,
      matchedPostId: img.postId ?? undefined,
      score: 1 - img.dist / 64,
    };
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
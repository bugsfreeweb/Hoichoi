/**
 * Per-image approval records.
 *
 * "An operator looked at the pictures before publishing" was a claim with no row
 * behind it. The pipeline's own rules (prompt policy, no real faces, no
 * watermarks) stop an obviously bad picture being *generated*, and moderation
 * approves the post as a whole — but a post can carry five gallery images and
 * nothing recorded which of them a human had actually seen.
 *
 * So every decision about one image is one row, and the standing verdict for a
 * path is the newest row for that path. Two rules follow from that and are the
 * reason this lives in its own module:
 *
 *  - a rejection wins: if the newest row says `rejected`, an older `approved`
 *    row cannot publish it;
 *  - nothing is deleted. A later approval supersedes a rejection by order, so
 *    the history of "who let this through" survives.
 *
 * A path with no row has no verdict — and "no verdict" is not "approved".
 */

import { randomBytes } from "node:crypto";
import { getClient, nowIso } from "./client";

export type ImageVerdict = "approved" | "rejected";

export interface ImageReviewRow {
  id: string;
  post_id: string | null;
  path: string;
  verdict: ImageVerdict;
  reason: string | null;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
}

/** Reasons an operator can pick from, in the language the console shows. */
export const IMAGE_REJECT_REASONS = [
  "নকল/ওয়াটারমার্ক",
  "প্রাসঙ্গিক নয়",
  "মান খারাপ",
  "শনাক্তযোগ্য মুখ",
  "ভুল তথ্যের ইঙ্গিত",
] as const;

/** The review clock: never behind the row it follows. */
function nextReviewIso(previous: string | undefined): string {
  const now = nowIso();
  if (!previous) return now;
  const previousMs = Date.parse(previous);
  if (!Number.isFinite(previousMs)) return now;
  const nowMs = Date.parse(now);
  if (nowMs > previousMs) return now;
  return new Date(previousMs + 1).toISOString();
}

export async function recordImageReview(input: {
  postId: string | null;
  path: string;
  verdict: ImageVerdict;
  reason?: string | null;
  reviewedBy: string;
}): Promise<ImageReviewRow> {
  const client = getClient();
  /**
   * Strictly increasing per path.
   *
   * The standing verdict is "the newest row wins", so two decisions that land in
   * the same millisecond have no order and a review made *after* a rejection
   * could be read as simultaneous — which the tie rule hands to the rejection.
   * A reviewer clicking twice quickly is exactly that case, and it turned
   * `a later approval supersedes the rejection` into a coin flip that failed in
   * CI. The timestamp of this row is therefore never less than one millisecond
   * after the newest row for the same path.
   */
  const latest = await client.execute({
    sql: "SELECT reviewed_at FROM image_reviews WHERE path = ? ORDER BY reviewed_at DESC, rowid DESC LIMIT 1",
    args: [input.path],
  });
  const previous = (latest.rows[0] as { reviewed_at?: string } | undefined)?.reviewed_at;
  const reviewedAt = nextReviewIso(previous);
  const row: ImageReviewRow = {
    id: randomBytes(16).toString("hex"),
    post_id: input.postId,
    path: input.path,
    verdict: input.verdict,
    reason: input.reason?.trim() ? input.reason.trim().slice(0, 200) : null,
    reviewed_by: input.reviewedBy,
    reviewed_at: reviewedAt,
    created_at: reviewedAt,
  };
  await client.execute({
    sql: "INSERT INTO image_reviews (id, post_id, path, verdict, reason, reviewed_by, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      row.id,
      row.post_id,
      row.path,
      row.verdict,
      row.reason,
      row.reviewed_by,
      row.reviewed_at,
      row.created_at,
    ],
  });
  return row;
}

export async function listImageReviews(
  postId: string,
): Promise<ImageReviewRow[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM image_reviews WHERE post_id = ? ORDER BY reviewed_at DESC, rowid DESC",
    args: [postId],
  });
  return res.rows.map((r) => mapRow(r as Record<string, unknown>));
}

function mapRow(row: Record<string, unknown>): ImageReviewRow {
  return {
    id: String(row.id),
    post_id: (row.post_id as string | null) ?? null,
    path: String(row.path),
    verdict: (row.verdict === "rejected"
      ? "rejected"
      : "approved") as ImageVerdict,
    reason: (row.reason as string | null) ?? null,
    reviewed_by: String(row.reviewed_by),
    reviewed_at: String(row.reviewed_at),
    created_at: String(row.created_at),
  };
}

/**
 * The standing verdict for each image of a post: the newest row wins, with a
 * same-instant rejection beating an approval (a failure beats a success).
 */
export function standingVerdicts(
  rows: ImageReviewRow[],
): Map<string, ImageReviewRow> {
  const order = [...rows].sort((a, b) => {
    if (a.reviewed_at !== b.reviewed_at)
      return a.reviewed_at < b.reviewed_at ? 1 : -1;
    if (a.verdict !== b.verdict) return a.verdict === "rejected" ? -1 : 1;
    return 0;
  });
  const out = new Map<string, ImageReviewRow>();
  for (const row of order) if (!out.has(row.path)) out.set(row.path, row);
  return out;
}

export interface ImagePublishConflict {
  path: string;
  reason: string | null;
  reviewedBy: string;
  reviewedAt: string;
}

/**
 * Why this post's pictures may not go live, or `null`.
 *
 * Called before a status change to `published`. It reports every rejected image
 * the post still carries, so the operator is told what to do rather than being
 * stopped by a wall.
 */
export async function imagePublishConflict(
  postId: string,
  paths: Array<string | null | undefined>,
): Promise<ImagePublishConflict[]> {
  const rows = await listImageReviews(postId).catch(
    () => [] as ImageReviewRow[],
  );
  if (rows.length === 0) return [];
  const standing = standingVerdicts(rows);
  const out: ImagePublishConflict[] = [];
  const seen = new Set<string>();
  for (const path of paths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const verdict = standing.get(path);
    if (verdict?.verdict === "rejected") {
      out.push({
        path,
        reason: verdict.reason,
        reviewedBy: verdict.reviewed_by,
        reviewedAt: verdict.reviewed_at,
      });
    }
  }
  return out;
}

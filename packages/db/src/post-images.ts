/**
 * Post gallery images — extra images attached to a post beyond its single
 * primary `posts.media_path`. Populated by the collector (every image it could
 * mirror from the source post, `source: "collector"`) and by operators in the
 * web/desktop editors (`source: "admin"`). The primary image is NOT duplicated
 * here for the default article view; the detail page shows the primary hero and
 * then this gallery. `position` is the display order.
 */
import { randomBytes } from "node:crypto";
import type { MediaKind, PostImage } from "@hoichoi/shared-types";
import { getClient } from "./client";
import { nowIso } from "./client";

const uid = () => randomBytes(16).toString("hex");

function mapImage(row: Record<string, unknown>): PostImage {
  const kind = String(row.kind ?? "image");
  return {
    id: String(row.id),
    post_id: String(row.post_id),
    path: String(row.path),
    kind: (kind === "video" || kind === "none" ? kind : "image") as MediaKind,
    position: Number(row.position ?? 0),
    source: String(row.source) === "collector" ? "collector" : "admin",
    created_at: String(row.created_at),
  };
}

/** Gallery images for a post, in display order. */
export async function listPostImages(postId: string): Promise<PostImage[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM post_images WHERE post_id = ? ORDER BY position ASC, created_at ASC",
    args: [postId],
  });
  return res.rows.map((r) => mapImage(r as unknown as Record<string, unknown>));
}

/** Attach one image to a post. Returns the created row. */
export async function addPostImage(
  postId: string,
  path: string,
  opts: { kind?: MediaKind; source?: "collector" | "admin" } = {},
): Promise<PostImage> {
  const client = getClient();
  const clean = path.trim();
  if (!clean) throw new Error("image path required");
  const posRes = await client.execute({
    sql: "SELECT COALESCE(MAX(position), -1) AS m FROM post_images WHERE post_id = ?",
    args: [postId],
  });
  const position = Number((posRes.rows[0] as unknown as { m: number } | undefined)?.m ?? -1) + 1;
  const row: PostImage = {
    id: uid(),
    post_id: postId,
    path: clean,
    kind: opts.kind ?? "image",
    position,
    source: opts.source ?? "admin",
    created_at: nowIso(),
  };
  await client.execute({
    sql: "INSERT INTO post_images (id, post_id, path, kind, position, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [row.id, row.post_id, row.path, row.kind, row.position, row.source, row.created_at],
  });
  return row;
}

export async function removePostImage(id: string): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM post_images WHERE id = ?", args: [id] });
}

/**
 * Replace a post's collector-sourced gallery with a fresh set (used by the
 * pipeline on re-collection). Admin-attached images are left untouched so an
 * operator's additions survive a re-run. Items are de-duplicated by path and
 * ordered by their array index.
 */
export async function replaceCollectorImages(
  postId: string,
  items: Array<{ path: string; kind?: MediaKind }>,
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "DELETE FROM post_images WHERE post_id = ? AND source = 'collector'",
    args: [postId],
  });
  const seen = new Set<string>();
  // Start after any existing admin images so collector shots group at the front
  // only when there are none; otherwise they append.
  const base = await client.execute({
    sql: "SELECT COALESCE(MAX(position), -1) AS m FROM post_images WHERE post_id = ?",
    args: [postId],
  });
  let position = Number((base.rows[0] as unknown as { m: number } | undefined)?.m ?? -1) + 1;
  const now = nowIso();
  for (const it of items) {
    const clean = it.path.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    await client.execute({
      sql: "INSERT INTO post_images (id, post_id, path, kind, position, source, created_at) VALUES (?, ?, ?, ?, ?, 'collector', ?)",
      args: [uid(), postId, clean, it.kind ?? "image", position++, now],
    });
  }
}

/**
 * Promote a gallery image to the post's primary image: copies its path into
 * `posts.media_path` and marks it an image. The gallery row is kept so it still
 * appears in the strip.
 */
export async function setPrimaryPostImage(postId: string, imageId: string): Promise<string | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT path FROM post_images WHERE id = ? AND post_id = ?",
    args: [imageId, postId],
  });
  const path = (res.rows[0] as unknown as { path: string } | undefined)?.path ?? null;
  if (!path) return null;
  await client.execute({
    sql: "UPDATE posts SET media_path = ?, media_kind = 'image', updated_at = ? WHERE id = ?",
    args: [path, nowIso(), postId],
  });
  return path;
}

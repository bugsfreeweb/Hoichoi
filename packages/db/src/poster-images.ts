/**
 * Poster bytes for a runtime with no writable disk.
 *
 * Vercel cannot keep a file written into `public/uploads`, and GitHub media
 * needs a token that the production project may not have. A poster that exists
 * only inside one HTTP response cannot be attached to a post or read by a
 * social crawler, so the compressed JPEG lives in the same database as the
 * article. The URL is stable and cacheable by id.
 */
import { randomUUID } from "node:crypto";
import { getClient, nowIso } from "./client";

export interface StoredPosterImage {
  id: string;
  post_id: string | null;
  aspect: string;
  content_type: string;
  data: string;
  bytes: number;
  created_at: string;
}

export async function savePosterImage(input: {
  postId?: string | null;
  aspect: string;
  contentType: string;
  bytes: Buffer;
  data?: Buffer;
}): Promise<string> {
  const id = randomUUID();
  const payload = input.data ?? input.bytes;
  await getClient().execute({
    sql: `INSERT INTO poster_images (id, post_id, aspect, content_type, data, bytes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.postId ?? null,
      input.aspect,
      input.contentType,
      payload.toString("base64"),
      payload.length,
      nowIso(),
    ],
  });
  return id;
}

export async function getPosterImage(id: string): Promise<StoredPosterImage | null> {
  const res = await getClient().execute({
    sql: "SELECT id, post_id, aspect, content_type, data, bytes, created_at FROM poster_images WHERE id = ?",
    args: [id],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    post_id: row.post_id ? String(row.post_id) : null,
    aspect: String(row.aspect),
    content_type: String(row.content_type),
    data: String(row.data),
    bytes: Number(row.bytes),
    created_at: String(row.created_at),
  };
}

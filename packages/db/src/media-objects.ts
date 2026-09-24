/**
 * Media object registry — one row per successfully uploaded remote blob so the
 * monthly retention job can delete old objects even after the owning `posts`
 * row has been purged by the archive window.
 */
import { randomBytes } from "node:crypto";
import { getClient } from "./client";
import { nowIso } from "./client";

export interface MediaObjectRow {
  id: string;
  adapter: string; // "github" | "s3:idrivee2" | "s3:backblaze"
  key: string; // object path inside the repo/bucket
  url: string; // public URL the web serves
  post_id: string | null;
  created_at: string;
}

export async function recordMediaObject(input: {
  adapter: string;
  key: string;
  url: string;
  post_id?: string | null;
}): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "INSERT INTO media_objects (id, adapter, key, url, post_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [randomBytes(16).toString("hex"), input.adapter, input.key, input.url, input.post_id ?? null, nowIso()],
  });
}

export async function listMediaObjects(olderThanIso?: string): Promise<MediaObjectRow[]> {
  const client = getClient();
  const res = olderThanIso
    ? await client.execute({
        sql: "SELECT * FROM media_objects WHERE created_at < ? ORDER BY created_at ASC LIMIT 5000",
        args: [olderThanIso],
      })
    : await client.execute("SELECT * FROM media_objects ORDER BY created_at DESC LIMIT 5000");
  return res.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: String(row.id),
      adapter: String(row.adapter),
      key: String(row.key),
      url: String(row.url),
      post_id: (row.post_id as string | null) ?? null,
      created_at: String(row.created_at),
    };
  });
}

export async function countMediaObjects(): Promise<number> {
  const client = getClient();
  const res = await client.execute("SELECT COUNT(*) AS n FROM media_objects");
  return Number((res.rows[0] as unknown as { n: number }).n);
}

export async function deleteMediaObjectRow(id: string): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM media_objects WHERE id = ?", args: [id] });
}
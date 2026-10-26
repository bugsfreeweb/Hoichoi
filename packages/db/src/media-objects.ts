/**
 * Media object registry — one row per successfully uploaded remote blob so the
 * monthly retention job can delete old objects even after the owning `posts`
 * row has been purged by the archive window, and so the admin can show
 * per-repository analytics (files, bytes, uploads/day, last upload).
 *
 * `adapter` is a per-target tag: `github:<owner/name>` for a media repo (or the
 * legacy bare `github`), `s3:<provider>[:<bucket>]` for object storage.
 */
import { randomBytes } from "node:crypto";
import { getClient } from "./client";
import { nowIso } from "./client";

export interface MediaObjectRow {
  id: string;
  adapter: string; // "github:<owner/name>" | "github" | "s3:idrivee2" | "s3:backblaze:<bucket>"
  key: string; // object path inside the repo/bucket
  url: string; // public URL the web serves
  post_id: string | null;
  bytes: number | null; // exact uploaded size (NULL on rows recorded before this column)
  created_at: string;
}

/** Aggregate usage for one media target (a repo or an S3 bucket). */
export interface MediaObjectStat {
  adapter: string;
  files: number;
  bytes: number;
  /** Files uploaded in the current UTC calendar day. */
  todayFiles: number;
  /** Bytes uploaded in the current UTC calendar day. */
  todayBytes: number;
  /** ISO timestamp of the newest upload into this target, or null. */
  lastUploadAt: string | null;
  /** Per-day upload growth, most recent day first (up to 30 days). */
  byDay: { day: string; bytes: number; files: number }[];
}

export async function recordMediaObject(input: {
  adapter: string;
  key: string;
  url: string;
  post_id?: string | null;
  bytes?: number | null;
}): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "INSERT INTO media_objects (id, adapter, key, url, post_id, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      randomBytes(16).toString("hex"),
      input.adapter,
      input.key,
      input.url,
      input.post_id ?? null,
      input.bytes ?? null,
      nowIso(),
    ],
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
      bytes: row.bytes == null ? null : Number(row.bytes),
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

/**
 * Per-target usage aggregation straight from the registry. Everything here is
 * measured (counts + SUM of the recorded sizes); rows from before the `bytes`
 * column contribute 0 to the byte totals rather than a fabricated estimate.
 */
export async function mediaObjectStats(): Promise<MediaObjectStat[]> {
  const client = getClient();
  const today = nowIso().slice(0, 10);
  const out = new Map<string, MediaObjectStat>();
  const ensure = (adapter: string): MediaObjectStat => {
    let s = out.get(adapter);
    if (!s) {
      s = { adapter, files: 0, bytes: 0, todayFiles: 0, todayBytes: 0, lastUploadAt: null, byDay: [] };
      out.set(adapter, s);
    }
    return s;
  };

  try {
    const agg = await client.execute(
      "SELECT adapter, count(*) AS files, COALESCE(sum(bytes), 0) AS bytes, max(created_at) AS last FROM media_objects GROUP BY adapter",
    );
    for (const r of agg.rows) {
      const row = r as Record<string, unknown>;
      const s = ensure(String(row.adapter));
      s.files = Number(row.files ?? 0);
      s.bytes = Number(row.bytes ?? 0);
      s.lastUploadAt = (row.last as string | null) ?? null;
    }

    const todayAgg = await client.execute({
      sql: "SELECT adapter, count(*) AS files, COALESCE(sum(bytes), 0) AS bytes FROM media_objects WHERE created_at LIKE ? GROUP BY adapter",
      args: [`${today}%`],
    });
    for (const r of todayAgg.rows) {
      const row = r as Record<string, unknown>;
      const s = ensure(String(row.adapter));
      s.todayFiles = Number(row.files ?? 0);
      s.todayBytes = Number(row.bytes ?? 0);
    }

    const daily = await client.execute({
      sql: "SELECT adapter, substr(created_at, 1, 10) AS day, count(*) AS files, COALESCE(sum(bytes), 0) AS bytes FROM media_objects WHERE created_at >= ? GROUP BY adapter, day ORDER BY day DESC",
      args: [`${new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)}%`],
    });
    for (const r of daily.rows) {
      const row = r as Record<string, unknown>;
      const s = ensure(String(row.adapter));
      if (s.byDay.length < 30) {
        s.byDay.push({
          day: String(row.day),
          files: Number(row.files ?? 0),
          bytes: Number(row.bytes ?? 0),
        });
      }
    }
  } catch {
    /* table missing on very old DBs → empty stats */
  }

  return [...out.values()];
}

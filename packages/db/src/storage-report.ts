/**
 * Storage report — database size, on-disk media usage and per-location media
 * totals for the admin + desktop analytics dashboards.
 *
 * Everything here is measured, never invented: the database size comes from the
 * SQLite page geometry, the local media totals come from an actual directory
 * walk, and each remote adapter is reported either as "not configured" or as a
 * full mirror of the local media set (which is what the uploader maintains).
 *
 * The walk is memoised for a short window because a naive scan of a large media
 * tree is expensive and the dashboards poll.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  StorageDayPoint,
  StorageLocation,
  StorageSnapshot,
  StorageTableSize,
} from "@hoichoi/shared-types";
import { getClient, nowIso, resolveDatabaseUrl } from "./client";
import { mediaRoot, mediaRootCandidates } from "./media";
import { getMediaStorageConfig } from "./media-storage";
const TABLE_NAMES = [
  "sources",
  "source_categories",
  "raw_posts",
  "posts",
  "comments",
  "reader_reports",
  "removal_requests",
  "notices",
  "pipeline_runs",
  "llm_providers",
  "submitted_pages",
  "admin_users",
  "admin_actions",
  "admin_login_log",
  "page_views",
  "ad_events",
] as const;

interface Cache {
  at: number;
  value: StorageSnapshot;
}

const TTL_MS = 15_000;
let cache: Cache | null = null;

/** Local filesystem path of the SQLite database, when it is a local file. */
function localDbPath(): string | null {
  try {
    const url = resolveDatabaseUrl();
    if (!url.startsWith("file:")) return null;
    return fileURLToPath(url);
  } catch {
    return null;
  }
}

async function dbSize(): Promise<{ bytes: number; pages: number; pageSize: number }> {
  const client = getClient();
  let pages = 0;
  let pageSize = 0;
  try {
    const p = await client.execute("PRAGMA page_count");
    pages = Number((p.rows[0] as Record<string, unknown> | undefined)?.page_count ?? 0);
  } catch {
    pages = 0;
  }
  try {
    const s = await client.execute("PRAGMA page_size");
    pageSize = Number((s.rows[0] as Record<string, unknown> | undefined)?.page_size ?? 0);
  } catch {
    pageSize = 0;
  }
  let bytes = pages * pageSize;
  if (bytes <= 0) {
    const p = localDbPath();
    if (p) {
      try {
        bytes = fs.statSync(p).size;
      } catch {
        bytes = 0;
      }
    }
  }
  return { bytes, pages, pageSize };
}

/** Walks a directory tree summing sizes and counting files, grouped by the
 *  first path segment (the media store writes `YYYY-MM-DD/kind_id.ext`). */
function scanMedia(root: string): { bytes: number; files: number; byDay: Map<string, { bytes: number; files: number }> } {
  const byDay = new Map<string, { bytes: number; files: number }>();
  let bytes = 0;
  let files = 0;
  const stack: string[] = [root];
  let guard = 0;
  while (stack.length > 0 && guard < 200_000) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      guard++;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        let size = 0;
        try {
          size = fs.statSync(full).size;
        } catch {
          size = 0;
        }
        bytes += size;
        files += 1;
        const rel = path.relative(root, full);
        const day = rel.split(/[\\/]/)[0] ?? "other";
        const bucket = byDay.get(day) ?? { bytes: 0, files: 0 };
        bucket.bytes += size;
        bucket.files += 1;
        byDay.set(day, bucket);
      }
    }
  }
  return { bytes, files, byDay };
}

async function tableSizes(): Promise<StorageTableSize[]> {
  const client = getClient();
  const out: StorageTableSize[] = [];
  for (const name of TABLE_NAMES) {
    try {
      const res = await client.execute(`SELECT count(*) AS n FROM ${name}`);
      out.push({ name, rows: Number((res.rows[0] as Record<string, unknown> | undefined)?.n ?? 0) });
    } catch {
      out.push({ name, rows: 0 });
    }
  }
  return out;
}

/** Uploaded-blob counts per remote adapter, from the media_objects registry. */
async function mediaObjectCounts(): Promise<Map<string, number>> {
  const client = getClient();
  const out = new Map<string, number>();
  try {
    const res = await client.execute("SELECT adapter, count(*) AS n FROM media_objects GROUP BY adapter");
    for (const r of res.rows) {
      const row = r as Record<string, unknown>;
      out.set(String(row.adapter), Number(row.n ?? 0));
    }
  } catch {
    /* table missing on very old DBs → no remote counts */
  }
  return out;
}

/** Real, measured storage snapshot. Cached briefly to keep polling cheap. */
export async function storageSnapshot(): Promise<StorageSnapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const [db, tables, mediaCfg, objectCounts] = await Promise.all([
    dbSize(),
    tableSizes(),
    getMediaStorageConfig().catch(() => null),
    mediaObjectCounts(),
  ]);

  const root = mediaRootCandidates()[0] ?? mediaRoot();
  const scan = scanMedia(root);
  const byDay: StorageDayPoint[] = [...scan.byDay.entries()]
    .map(([day, v]) => ({ day, bytes: v.bytes, files: v.files }))
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, 30);

  // Average local file size lets us turn the exact remote blob count into a
  // fair byte estimate, since media_objects records the key but not the size.
  const avgBytes = scan.files > 0 ? Math.round(scan.bytes / scan.files) : 0;

  const locations: StorageLocation[] = [
    {
      id: "local",
      label: "লোকাল ডিস্ক",
      kind: "local",
      enabled: true,
      configured: true,
      bytes: scan.bytes,
      files: scan.files,
      detail: "এই ডিভাইসের মিডিয়া ফোল্ডার (সরাসরি মাপা)",
    },
  ];

  const seen = new Set<string>();
  const adapterTag = (kind: string, provider?: string): string =>
    kind === "github" ? "github" : (provider ?? kind);
  for (const [i, a] of (mediaCfg?.adapters ?? []).entries()) {
    const tag = adapterTag(a.kind, a.provider);
    seen.add(tag);
    const files = objectCounts.get(tag) ?? 0;
    locations.push({
      id: tag || `adapter-${i}`,
      label: a.label || (a.kind === "github" ? "GitHub" : (a.provider ?? "S3")),
      kind: a.kind,
      provider: a.provider,
      enabled: Boolean(a.enabled),
      configured: Boolean(a.bucket || a.endpoint || a.kind === "github"),
      bytes: avgBytes > 0 ? avgBytes * files : 0,
      files,
      detail: a.enabled
        ? `রিমোট ব্লব: ${files.toLocaleString()} (মাপা) · আকার আনুমানিক`
        : "নিষ্ক্রিয় — ব্যাকআপ চেইনে নেই",
    });
  }

  // Adapters that received uploads historically but are no longer in the policy
  // still hold data off-box, so surface them rather than silently dropping them.
  for (const [tag, files] of objectCounts.entries()) {
    if (seen.has(tag)) continue;
    locations.push({
      id: tag,
      label: tag,
      kind: tag === "github" ? "github" : "s3",
      provider: tag === "github" ? undefined : tag,
      enabled: false,
      configured: false,
      bytes: avgBytes > 0 ? avgBytes * files : 0,
      files,
      detail: `সাবেক অ্যাডাপ্টার — এখন কনফিগে নেই, তবে ${files.toLocaleString()} ব্লব আছে`,
    });
  }

  const value: StorageSnapshot = {
    ok: true,
    generatedAt: nowIso(),
    db,
    media: { bytes: scan.bytes, files: scan.files, root, byDay },
    locations,
    tables,
  };
  cache = { at: Date.now(), value };
  return value;
}

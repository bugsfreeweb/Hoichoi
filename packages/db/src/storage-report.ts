/**
 * Storage report — database size, on-disk media usage and per-location (per
 * media repository) totals for the admin + desktop analytics dashboards.
 *
 * Everything here is measured, never invented: the database size comes from the
 * SQLite page geometry, the local media totals come from an actual directory
 * walk, and each remote target is reported from the `media_objects` registry
 * (exact file count and — for rows written since the size column landed — exact
 * bytes). No value is estimated.
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
  MediaStorageAdapterConfig,
} from "@hoichoi/shared-types";
import { getClient, nowIso, resolveDatabaseUrl } from "./client";
import { mediaRoot, mediaRootCandidates } from "./media";
import { getMediaStorageConfig } from "./media-storage";
import { githubTag, s3Tag } from "./storage";
import { mediaObjectStats, type MediaObjectStat } from "./media-objects";

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

/** The registry tag a configured adapter writes to (mirrors storage.ts). */
function adapterTagFor(a: MediaStorageAdapterConfig): string {
  if (a.kind === "github") {
    const repo = (a.repo ?? "").trim() || (process.env.GITHUB_REPO ?? "");
    return githubTag(repo);
  }
  const bucket = (a.bucket ?? "").trim() || (process.env[a.provider === "backblaze" ? "B2_BUCKET" : "IDRIVEE2_BUCKET"] ?? "");
  return s3Tag(a.provider ?? a.kind, bucket);
}

/** Fold one registry stat into another (used for legacy bare tags). */
function mergeStat(into: MediaObjectStat, from: MediaObjectStat): MediaObjectStat {
  into.files += from.files;
  into.bytes += from.bytes;
  into.todayFiles += from.todayFiles;
  into.todayBytes += from.todayBytes;
  if (from.lastUploadAt && (!into.lastUploadAt || from.lastUploadAt > into.lastUploadAt)) {
    into.lastUploadAt = from.lastUploadAt;
  }
  const days = new Map(into.byDay.map((d) => [d.day, d]));
  for (const d of from.byDay) {
    const cur = days.get(d.day);
    if (cur) {
      cur.files += d.files;
      cur.bytes += d.bytes;
    } else {
      days.set(d.day, { ...d });
    }
  }
  into.byDay = [...days.values()].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 30);
  return into;
}

const EMPTY_STAT = (adapter: string): MediaObjectStat => ({
  adapter,
  files: 0,
  bytes: 0,
  todayFiles: 0,
  todayBytes: 0,
  lastUploadAt: null,
  byDay: [],
});

/** Real, measured storage snapshot. Cached briefly to keep polling cheap. */
export async function storageSnapshot(): Promise<StorageSnapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const [db, tables, mediaCfg, stats] = await Promise.all([
    dbSize(),
    tableSizes(),
    getMediaStorageConfig().catch(() => null),
    mediaObjectStats().catch(() => [] as MediaObjectStat[]),
  ]);

  const root = mediaRootCandidates()[0] ?? mediaRoot();
  const scan = scanMedia(root);
  const byDay: StorageDayPoint[] = [...scan.byDay.entries()]
    .map(([day, v]) => ({ day, bytes: v.bytes, files: v.files }))
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, 30);

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

  const statByTag = new Map(stats.map((s) => [s.adapter, s]));
  const adapters = mediaCfg?.adapters ?? [];
  const ghCount = adapters.filter((a) => a.kind === "github").length;
  const consumed = new Set<string>();

  for (const [i, a] of adapters.entries()) {
    const tag = adapterTagFor(a);
    consumed.add(tag);
    let stat = statByTag.get(tag);
    // Fold legacy bare-`github` rows into the sole GitHub repo so the numbers
    // stay right for installs that uploaded before per-repo tagging existed.
    if (a.kind === "github" && ghCount === 1) {
      const legacy = statByTag.get("github");
      if (legacy && legacy.adapter !== tag) {
        stat = stat ? mergeStat({ ...stat, byDay: [...stat.byDay] }, legacy) : { ...legacy };
        consumed.add("github");
      }
    }
    const s = stat ?? EMPTY_STAT(tag);
    locations.push({
      id: tag || `adapter-${i}`,
      label: a.label || (a.kind === "github" ? "GitHub" : (a.provider ?? "S3")),
      kind: a.kind,
      provider: a.provider,
      repo: a.kind === "github" ? (a.repo ?? "").trim() || (process.env.GITHUB_REPO ?? null) : null,
      cdnBase:
        a.kind === "github"
          ? (a.cdnBase ?? "").trim() || (process.env.GITHUB_CDN_URL ?? null)
          : null,
      enabled: Boolean(a.enabled),
      configured: Boolean(a.bucket || a.endpoint || a.kind === "github"),
      bytes: s.bytes,
      files: s.files,
      lastUploadAt: s.lastUploadAt,
      uploadedToday: s.todayFiles,
      bytesToday: s.todayBytes,
      byDay: s.byDay,
      detail: a.enabled
        ? `${s.files.toLocaleString()} ব্লব · ${(s.bytes / 1024 / 1024).toFixed(1)} MB (মাপা)`
        : "নিষ্ক্রিয় — ডিস্ট্রিবিউশনে নেই",
    });
  }

  // Targets that received uploads historically but are no longer in the policy
  // still hold data off-box, so surface them rather than silently dropping them.
  for (const s of stats) {
    if (consumed.has(s.adapter)) continue;
    const isGh = s.adapter === "github" || s.adapter.startsWith("github:");
    locations.push({
      id: s.adapter,
      label: s.adapter,
      kind: isGh ? "github" : "s3",
      provider: isGh ? undefined : s.adapter.replace(/^s3:/, "").split(":")[0],
      repo: isGh && s.adapter.includes(":") ? s.adapter.slice("github:".length) : null,
      enabled: false,
      configured: false,
      bytes: s.bytes,
      files: s.files,
      lastUploadAt: s.lastUploadAt,
      uploadedToday: s.todayFiles,
      bytesToday: s.todayBytes,
      byDay: s.byDay,
      detail: `সাবেক টার্গেট — এখন কনফিগে নেই, তবে ${s.files.toLocaleString()} ব্লব আছে`,
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

/**
 * Media orphan reconciliation.
 *
 * Media can fall out of sync in ways nobody sees:
 * - an upload crashed after the file was written but before `posts.media_path`
 *   was set, leaving an unreferenced file eating disk;
 * - a post was archived/purged but its local or remote blob is still there;
 * - two `media_objects` rows exist for the same adapter+key (a retry that
 *   somehow recorded twice), double-counting the quota;
 * - a remote object's post is gone, so the retention job will never find it
 *   through `posts` and the blob piles up forever.
 *
 * `reconcileMedia()` classifies every discrepancy in one scan. Cleanup only
 * ever deletes what is *provably* unreferenced — never a file that a post still
 * points at, and never a file younger than the guard window (an upload still in
 * flight must not look like an orphan).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { getClient } from "./client";
import { mediaRoot, mediaRootCandidates, localMediaPath } from "./media";
import { listMediaObjects, type MediaObjectRow } from "./media-objects";
import { recordProviderRemoval } from "./provider-health";

export type OrphanClass =
  | "unreferenced_local"
  | "missing_local"
  | "duplicate_remote_row"
  | "remote_row_without_post";

export interface ReconcileItem {
  kind: OrphanClass;
  rel: string;
  detail: string;
  /** Local files older than this are safe to delete; younger ones are suspect. */
  ageMs?: number;
  bytes?: number;
}

export interface ReconcileReport {
  scannedLocalFiles: number;
  referencedPaths: number;
  remoteRows: number;
  items: ReconcileItem[];
  /** Set only for a real (non-dry) run that deleted something. */
  deletedLocal: string[];
  deletedRemoteRows: number;
  /** Straightforward totals so the dashboard does not have to count items. */
  byClass: Record<OrphanClass, number>;
  ranAt: string;
}

/** Files this young may belong to an upload still in flight. Skip them. */
export const ORPHAN_AGE_GUARD_MS = 6 * 60 * 60 * 1000;

export interface ReconcileOptions {
  dryRun: boolean;
  /** Override for tests: absolute path under which `media/…` rels live. */
  rootOverride?: string;
  now?: Date;
}

function walkMediaDir(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // missing/corrupt subtree — just not part of the scan
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) stack.push(full);
      } else if (!entry.name.startsWith(".")) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

/** A media path that lives on the local tree, not on someone else's CDN. */
function isLocalRef(p: string): boolean {
  return !/^(https?:)?\/\//i.test(p) && !p.startsWith("data:") && !p.startsWith("/");
}

/** The set of relative media paths the site actually references. */
async function referencedPaths(client: Awaited<ReturnType<typeof getClient>>): Promise<Set<string>> {
  const refs = new Set<string>();
  const [posts, images, raw] = await Promise.all([
    client.execute("SELECT media_path FROM posts WHERE media_path IS NOT NULL AND media_path != ''"),
    client.execute("SELECT path FROM post_images"),
    // A scraped-but-not-yet-rewritten post still owns its screenshot; deleting it
    // would blank the preview on the desk for a post that is merely queued.
    client.execute("SELECT screenshot_path FROM raw_posts WHERE screenshot_path IS NOT NULL AND screenshot_path != ''"),
  ]);
  for (const row of posts.rows) refs.add(String((row as Record<string, unknown>).media_path));
  for (const row of images.rows) refs.add(String((row as Record<string, unknown>).path));
  for (const row of raw.rows) refs.add(String((row as Record<string, unknown>).screenshot_path));
  return refs;
}

/** rel of a local file under the media root, or null if it lives outside. */
function relUnderRoot(file: string, root: string): string | null {
  const norm = path.normalize(root) + path.sep;
  if (!file.startsWith(norm)) return null;
  return file.slice(norm.length).split(path.sep).join("/");
}

export async function reconcileMedia(options: ReconcileOptions): Promise<ReconcileReport> {
  const dryRun = options.dryRun;
  const now = options.now ?? new Date();
  const client = getClient();
  const root = options.rootOverride ?? mediaRootCandidates()[0] ?? mediaRoot();
  const ranAt = now.toISOString();
  const report: ReconcileReport = {
    scannedLocalFiles: 0,
    referencedPaths: 0,
    remoteRows: 0,
    items: [],
    deletedLocal: [],
    deletedRemoteRows: 0,
    byClass: { unreferenced_local: 0, missing_local: 0, duplicate_remote_row: 0, remote_row_without_post: 0 },
    ranAt,
  };

  const allRefs = await referencedPaths(client);
  // External image URLs (Pexels, a source CDN) are legitimately not on our disk;
  // counting them as "missing local" made every such post look broken.
  const refs = new Set([...allRefs].filter(isLocalRef));
  report.referencedPaths = refs.size;

  // --- local tree vs references -------------------------------------------
  const files = fs.existsSync(root) ? walkMediaDir(root) : [];
  report.scannedLocalFiles = files.length;
  const seen = new Set<string>();
  for (const file of files) {
    const rel = relUnderRoot(file, root) ?? file;
    seen.add(rel);
    if (!refs.has(rel)) {
      let stat: fs.Stats | undefined;
      try {
        stat = fs.statSync(file);
      } catch {
        stat = undefined;
      }
      const ageMs = stat ? Math.max(0, now.getTime() - stat.mtimeMs) : 0;
      report.byClass.unreferenced_local++;
      report.items.push({
        kind: "unreferenced_local",
        rel,
        detail:
          ageMs < ORPHAN_AGE_GUARD_MS
            ? "not referenced by any post — younger than the 6 h guard, suspected in-flight upload"
            : "not referenced by any post, no remote object",
        ageMs,
        bytes: stat?.size,
      });
    }
  }

  // Referenced paths with neither a local file nor a remote row: broken media.
  for (const rel of refs) {
    if (seen.has(rel)) continue;
    report.byClass.missing_local++;
    report.items.push({
      kind: "missing_local",
      rel,
      detail: "a post references this path but neither the local file nor a remote object has it",
    });
  }

  // --- media_objects rows --------------------------------------------------
  const objects = await listMediaObjects();
  report.remoteRows = objects.length;

  // Posts the archive window may already have purged; a remote row left behind
  // then can never be reached by the retention job, which walks live posts.
  const referencedPostIds = new Set<string>();
  const idRes = await client.execute(
    "SELECT id FROM posts WHERE id IN (SELECT DISTINCT post_id FROM media_objects WHERE post_id IS NOT NULL)",
  );
  for (const row of idRes.rows) referencedPostIds.add(String((row as Record<string, unknown>).id));

  /**
   * The relative media path an object belongs to: `media/2026/a.jpg` →
   * `2026/a.jpg`, which is the form `posts.media_path` stores. A key with no
   * media/ prefix is its own rel (some adapters use a bare prefix).
   */
  const relOfKey = (key: string): string => key.replace(/^media\//, "");

  const objectByKey = new Map<string, MediaObjectRow[]>();
  for (const obj of objects) {
    const id = `${obj.adapter}::${obj.key}`;
    const bucket = objectByKey.get(id) ?? [];
    bucket.push(obj);
    objectByKey.set(id, bucket);
  }

  for (const [id, bucket] of objectByKey) {
    if (bucket.length > 1) {
      // Keep the oldest row; every extra one double-counts the provider quota.
      report.byClass.duplicate_remote_row += bucket.length - 1;
      report.items.push({
        kind: "duplicate_remote_row",
        rel: id,
        detail: `${bucket.length} rows for the same adapter+key; the quota is double-counted`,
      });
    }
    const first = bucket[0]!;
    const stillReferenced = refs.has(relOfKey(first.key));
    const postGone = first.post_id !== null && !referencedPostIds.has(first.post_id);
    if (postGone && !stillReferenced) {
      report.byClass.remote_row_without_post++;
      report.items.push({
        kind: "remote_row_without_post",
        rel: id,
        detail: `its post is gone and no live post points at ${relOfKey(first.key)}`,
      });
    }
  }

  // --- act, but only on what is provably safe ------------------------------
  if (!dryRun) {
    for (const item of report.items) {
      if (item.kind === "unreferenced_local" && (item.ageMs ?? 0) >= ORPHAN_AGE_GUARD_MS) {
        // item.rel is always relative to the media root (forward slashes), so it
        // must be re-joined: passing it straight to unlink resolved against the
        // process cwd and silently failed.
        const full = path.join(root, item.rel.split("/").join(path.sep));
        try {
          fs.unlinkSync(full);
          report.deletedLocal.push(item.rel);
        } catch {
          /* raced with something else — next run will recheck */
        }
      }
    }

    for (const item of report.items) {
      if (item.kind === "duplicate_remote_row") {
        const parts = item.rel.split("::");
        const adapter = parts[0] ?? "";
        const key = parts.slice(1).join("::");
        if (!adapter || !key) continue;
        const res = await client.execute({
          sql: "SELECT id, bytes FROM media_objects WHERE adapter = ? AND key = ? ORDER BY created_at ASC",
          args: [adapter, key],
        });
        for (const row of res.rows.slice(1)) {
          const rec = row as Record<string, unknown>;
          await client.execute({ sql: "DELETE FROM media_objects WHERE id = ?", args: [String(rec.id)] });
          await recordProviderRemoval(adapter, Number(rec.bytes ?? 0)).catch(() => undefined);
          report.deletedRemoteRows++;
        }
      } else if (item.kind === "remote_row_without_post") {
        const parts = item.rel.split("::");
        const adapter = parts[0] ?? "";
        const key = parts.slice(1).join("::");
        if (!adapter || !key) continue;
        const res = await client.execute({
          sql: "SELECT id, bytes FROM media_objects WHERE adapter = ? AND key = ? ORDER BY created_at ASC LIMIT 1",
          args: [adapter, key],
        });
        for (const row of res.rows) {
          const rec = row as Record<string, unknown>;
          await client.execute({ sql: "DELETE FROM media_objects WHERE id = ?", args: [String(rec.id)] });
          await recordProviderRemoval(adapter, Number(rec.bytes ?? 0)).catch(() => undefined);
          report.deletedRemoteRows++;
        }
      }
    }
  }

  return report;
}
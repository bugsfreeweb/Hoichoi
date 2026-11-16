import fs from "node:fs";
import path from "node:path";
import { getClient } from "./client";
import { logDeletion } from "./deletion-log";
import { mediaRoot, mediaRootCandidates } from "./media";

/**
 * Post media cleanup — deleting the blob along with the article.
 *
 * Earlier the row went and the bytes stayed: a `DELETE FROM posts` left the
 * image behind in every mirror folder, where the reconcile job could not reach
 * it (the post no longer existed to be checked, and the reconcile guard only
 * handles *unreferenced* local files). This turns that loose end into a
 * verified step of the delete:
 *
 *  - collect every path the post's media references (its own `media_path` and
 *    its `post_images` gallery),
 *  - skip http(s) URLs (no invented provider delete integration), and skip any
 *    path a *live* post still references — a shared image must survive,
 *  - unlink the file from every mirror root that has a copy,
 *  - write the outcome in the deletion ledger, failures included.
 *
 * `retryMediaDeletions` is the retry pass: it re-reads failed media rows and
 * tries again, so a transient lock (Windows keeps a handle for a beat) does not
 * need a human.
 */

export interface MediaPurgeEntry {
  path: string;
  deleted: boolean;
  removedFrom: string[];
  failedFrom: string[];
  skippedReason?: string;
}

/** Every folder expected to hold a served copy of a stored rel path. */
export function mediaCopyRoots(): string[] {
  const roots = [...mediaRootCandidates()];
  const repo = process.cwd();
  const web = path.join(repo, "apps", "web", "public", "uploads");
  if (!roots.includes(web)) roots.push(web);
  return roots;
}

/** Resolve a stored relative path against every mirror root. */
function copiesOf(rel: string): string[] {
  return mediaCopyRoots()
    .map((root) => path.resolve(root, rel))
    .filter((full) => fs.existsSync(full));
}

function stillReferencedElsewhere(rel: string, exceptPostId: string): Promise<boolean> {
  const client = getClient();
  return (async () => {
    const byPost = await client.execute({
      sql: "SELECT COUNT(*) AS n FROM posts WHERE media_path = ? AND id != ?",
      args: [rel, exceptPostId],
    });
    if (Number((byPost.rows[0] as Record<string, unknown>).n) > 0) return true;
    const byGallery = await client.execute({
      sql: "SELECT COUNT(*) AS n FROM post_images WHERE path = ? AND post_id != ?",
      args: [rel, exceptPostId],
    });
    if (Number((byGallery.rows[0] as Record<string, unknown>).n) > 0) return true;
    const byObjects = await client.execute({
      sql: "SELECT COUNT(*) AS n FROM media_objects WHERE key = ?",
      args: [rel],
    });
    return Number((byObjects.rows[0] as Record<string, unknown>).n) > 0;
  })();
}

function isHttp(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Delete the files a post referenced. Call *after* the post row is gone, so the
 * reference checks in `stillReferencedElsewhere` see a truthful world.
 */
export async function purgePostMedia(
  postId: string,
  /** Paths captured *before* the row was deleted (see deletePost). */
  knownPaths: readonly string[] = [],
  opts: { actor?: string | null; reason?: string | null } = {},
): Promise<MediaPurgeEntry[]> {
  const client = getClient();
  const rawPaths: string[] = [...knownPaths];

  // Fallback for callers that still have the row (a dry-run, a manual cleanup).
  if (rawPaths.length === 0) {
    const postRow = await client.execute({
      sql: "SELECT media_path FROM posts WHERE id = ?",
      args: [postId],
    });
    const mediaPath = (postRow.rows[0] as Record<string, unknown> | undefined)?.media_path;
    if (typeof mediaPath === "string" && mediaPath) rawPaths.push(mediaPath);

    const gallery = await client.execute({
      sql: "SELECT path FROM post_images WHERE post_id = ?",
      args: [postId],
    });
    for (const row of gallery.rows) {
      const p = String((row as Record<string, unknown>).path);
      if (p) rawPaths.push(p);
    }
  }

  const unique = [...new Set(rawPaths)];
  const entries: MediaPurgeEntry[] = [];

  for (const rel of unique) {
    if (isHttp(rel)) {
      entries.push({ path: rel, deleted: false, removedFrom: [], failedFrom: [], skippedReason: "remote url" });
      continue;
    }
    if (await stillReferencedElsewhere(rel, postId)) {
      entries.push({ path: rel, deleted: false, removedFrom: [], failedFrom: [], skippedReason: "still referenced" });
      continue;
    }

    const copies = copiesOf(rel);
    const removedFrom: string[] = [];
    const failedFrom: string[] = [];
    for (const full of copies) {
      try {
        fs.unlinkSync(full);
        removedFrom.push(full);
      } catch {
        failedFrom.push(full);
      }
    }
    // The file may have lived only on a remote provider with no delete API;
    // that is a truthful `deleted:false` with the reason below.
    entries.push({
      path: rel,
      deleted: removedFrom.length > 0,
      removedFrom,
      failedFrom,
      ...(removedFrom.length === 0 && failedFrom.length === 0
        ? { skippedReason: "no local copies found" }
        : {}),
      ...(failedFrom.length > 0 ? { skippedReason: `${failedFrom.length} copy failed` } : {}),
    });

    await logDeletion({
      entityType: "media",
      entityId: rel,
      reason: opts.reason ?? "post delete",
      actor: opts.actor ?? null,
      detail: {
        post_id: postId,
        deleted: entries[entries.length - 1]!.deleted,
        removed_from: removedFrom,
        failed_from: failedFrom,
        skipped_reason: entries[entries.length - 1]!.skippedReason ?? null,
      },
    }).catch(() => undefined);
  }

  return entries;
}

/** Re-attempt every failed media deletion recorded in the ledger. */
export async function retryMediaDeletions(limit = 50): Promise<{ retried: number; deleted: number }> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT id, entity_id, detail_json FROM deletion_log WHERE entity_type = 'media' ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });

  let retried = 0;
  let deleted = 0;
  for (const row of res.rows) {
    const id = String(row.id);
    let detail: Record<string, unknown> | null = null;
    try {
      detail = row.detail_json ? (JSON.parse(String(row.detail_json)) as Record<string, unknown>) : null;
    } catch {
      continue;
    }
    const failed = Array.isArray(detail?.failed_from) ? (detail.failed_from as string[]) : [];
    const rel = String(row.entity_id);
    if (failed.length === 0) continue;
    if (!isHttp(rel) && !(await stillReferencedElsewhere(rel, ""))) {
      const copies = copiesOf(rel);
      const nowGone: string[] = [];
      for (const full of copies) {
        try {
          fs.unlinkSync(full);
          nowGone.push(full);
        } catch {
          /* still locked — next retry */
        }
      }
      if (nowGone.length > 0) {
        deleted += 1;
        retried += 1;
        await client.execute({
          sql: "UPDATE deletion_log SET detail_json = ? WHERE id = ?",
          args: [
            JSON.stringify({
              ...(detail ?? {}),
              removed_from: [...(Array.isArray(detail?.removed_from) ? detail.removed_from : []), ...nowGone],
              failed_from: failed.filter((f) => !nowGone.includes(f)),
              retried_at: new Date().toISOString(),
            }),
            id,
          ],
        });
      } else {
        retried += 1;
      }
    } else {
      retried += 1;
    }
  }
  return { retried, deleted };
}
/**
 * Media deleted with the article — and recorded.
 *
 * The bug this pins: `DELETE FROM posts` removed the row and left the image in
 * every mirror folder, where nothing would ever clean it (the reconcile guard
 * only looks at files that are still on disk *and* unreferenced, and the post
 * was already gone). Now the delete verifies the blob too, skips anything a
 * live post still points at, and writes the outcome to the ledger — failures
 * included, so a locked file can be retried instead of forgotten.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { __useClientForTests } from "../client";
import { logDeletion } from "../deletion-log";
import { purgePostMedia, retryMediaDeletions } from "../post-media-cleanup";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "hoichoi-media-"));
process.env.HOICHOI_MEDIA_ROOT = path.join(root, "media");

const file = path.join(os.tmpdir(), `hoichoi-media-cleanup-${Date.now()}.db`);
const client = createClient({ url: `file:${file}` });
__useClientForTests(client);

await client.executeMultiple(`
CREATE TABLE posts (id TEXT PRIMARY KEY, media_path TEXT);
CREATE TABLE post_images (id TEXT PRIMARY KEY, post_id TEXT, path TEXT);
CREATE TABLE media_objects (id TEXT PRIMARY KEY, key TEXT);
CREATE TABLE deletion_log (
  id TEXT PRIMARY KEY, entity_type TEXT, entity_id TEXT, reason TEXT, actor TEXT,
  detail_json TEXT, created_at TEXT
);
`);

let passed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

function writeMedia(rel: string): string {
  const full = path.join(process.env.HOICHOI_MEDIA_ROOT!, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, "webp-bytes");
  return full;
}

const ledgerRows = async (): Promise<Array<Record<string, unknown>>> =>
  (await client.execute("SELECT * FROM deletion_log WHERE entity_type = 'media'")).rows as Array<
    Record<string, unknown>
  >;

await check("the image file and its gallery copies are removed", async () => {
  writeMedia("x/one.webp");
  writeMedia("x/two.webp");
  await client.execute("INSERT INTO posts (id, media_path) VALUES ('p1', 'x/one.webp')");
  await client.execute("INSERT INTO post_images (id, post_id, path) VALUES ('i1','p1','x/two.webp')");
  // The row is gone before the purge runs, exactly like deletePost does it.
  await client.execute("DELETE FROM posts WHERE id = 'p1'");
  await client.execute("DELETE FROM post_images WHERE post_id = 'p1'");

  const entries = await purgePostMedia("p1", ["x/one.webp", "x/two.webp"], {
    actor: "editor@x",
    reason: "post delete",
  });
  assert.equal(entries.length, 2);
  assert.ok(entries.every((e) => e.deleted));
  assert.equal(fs.existsSync(path.join(process.env.HOICHOI_MEDIA_ROOT!, "x/one.webp")), false);
  assert.equal(fs.existsSync(path.join(process.env.HOICHOI_MEDIA_ROOT!, "x/two.webp")), false);
});

await check("each removal is a ledger row naming the path and the actor", async () => {
  const rows = await ledgerRows();
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.actor, "editor@x");
  const detail = JSON.parse(String(rows[0]?.detail_json)) as Record<string, unknown>;
  assert.equal(detail.post_id, "p1");
  assert.equal(detail.deleted, true);
});

await check("an image another post still uses is not deleted", async () => {
  writeMedia("x/shared.webp");
  await client.execute("INSERT INTO posts (id, media_path) VALUES ('p2', 'x/shared.webp')");
  await client.execute("INSERT INTO posts (id, media_path) VALUES ('p3', 'x/shared.webp')");
  await client.execute("DELETE FROM posts WHERE id = 'p2'");

  const entries = await purgePostMedia("p2", ["x/shared.webp"]);
  assert.equal(entries[0]?.deleted, false);
  assert.equal(entries[0]?.skippedReason, "still referenced");
  assert.equal(fs.existsSync(path.join(process.env.HOICHOI_MEDIA_ROOT!, "x/shared.webp")), true);
});

await check("a remote http url is not touched and says so", async () => {
  const entries = await purgePostMedia("p4");
  assert.equal(entries.length, 0, "no media for an unknown post");
  await client.execute("INSERT INTO posts (id, media_path) VALUES ('p5','https://cdn.example/a.webp')");
  await client.execute("DELETE FROM posts WHERE id = 'p5'");
  const res = await purgePostMedia("p5", ["https://cdn.example/a.webp"]);
  assert.equal(res[0]?.deleted, false);
  assert.equal(res[0]?.skippedReason, "remote url");
});

await check("a missing file is reported, not invented as deleted", async () => {
  await client.execute("INSERT INTO posts (id, media_path) VALUES ('p6','x/gone.webp')");
  await client.execute("DELETE FROM posts WHERE id = 'p6'");
  const res = await purgePostMedia("p6", ["x/gone.webp"]);
  assert.equal(res[0]?.deleted, false);
  assert.equal(res[0]?.skippedReason, "no local copies found");
});

await check("a failed deletion is retried later and the row is updated", async () => {
  // Simulate a locked copy: record a ledger row claiming a failure, then make
  // the file exist again and let the retry pass find it.
  writeMedia("x/late.webp");
  await logDeletion({
    entityType: "media",
    entityId: "x/late.webp",
    reason: "post delete",
    actor: "editor@x",
    detail: { post_id: "p9", deleted: false, removed_from: [], failed_from: [path.join(process.env.HOICHOI_MEDIA_ROOT!, "x/late.webp")] },
  });
  const out = await retryMediaDeletions(20);
  assert.ok(out.retried >= 1);
  assert.ok(out.deleted >= 1);
  const row = (
    await client.execute("SELECT detail_json FROM deletion_log WHERE entity_id = 'x/late.webp'")
  ).rows[0] as Record<string, unknown>;
  const detail = JSON.parse(String(row.detail_json)) as Record<string, unknown>;
  assert.deepEqual(detail.failed_from, []);
  assert.ok(detail.retried_at);
  assert.equal(fs.existsSync(path.join(process.env.HOICHOI_MEDIA_ROOT!, "x/late.webp")), false);
});

console.log(`\n${passed} media-cleanup checks passed.`);
client.close();
try {
  fs.rmSync(root, { recursive: true, force: true });
  fs.unlinkSync(file);
} catch {
  // Windows holds handles for a beat; temp files are harmless.
}
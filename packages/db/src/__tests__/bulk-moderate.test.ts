import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { bulkDeletePosts, bulkModeratePosts } from "../index";

/**
 * Regression test for the desk's bulk-approve button.
 *
 * Two independent problems made "বাল্ক অনুমোদন" look broken:
 *
 *  1. The UI looped `queue set` once per row, so a 60-row selection fired 60
 *     sequential runner calls with no feedback.
 *  2. Categories with `requires_double_approval` (child-sexual-abuse,
 *     extramarital-crime) park a post at `approved` after the first sign-off
 *     instead of publishing it — and the queue UI rendered `approved` with the
 *     exact same badge as `pending_review`, so a successful approval looked
 *     identical to a no-op.
 *
 * This pins the batch contract: correct final statuses, the double-approval
 * hold reported separately, and per-row reporting for a mixed selection.
 */
const DB = path.join(process.cwd(), ".tmp-bulk-moderate-test.db");
const DB_URL = `file:${DB}`;

async function seed(): Promise<void> {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    fs.rmSync(`${DB}${suffix}`, { force: true });
  }
  process.env.TURSO_DATABASE_URL = DB_URL;
  process.env.TURSO_AUTH_TOKEN = "local";

  const { getClient } = await import("../client");
  const client = getClient();
  await client.batch(
    [
      `CREATE TABLE category_configs (
         slug TEXT PRIMARY KEY, display_name_bn TEXT, display_name_en TEXT,
         config TEXT, is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0
       )`,
      `INSERT INTO category_configs (slug, config) VALUES
         ('child-sexual-abuse', '{"requires_double_approval":true}'),
         ('missing-children',   '{"requires_double_approval":false}')`,
      `CREATE TABLE posts (
         id TEXT PRIMARY KEY, category TEXT, status TEXT,
         published_at TEXT, updated_at TEXT, title_bn TEXT
       )`,
      `INSERT INTO posts (id, category, status, title_bn) VALUES
         ('p-double-1',  'child-sexual-abuse', 'pending_review', 'ডাবল ১'),
         ('p-double-2',  'child-sexual-abuse', 'pending_review', 'ডাবল ২'),
         ('p-single-1',  'missing-children',   'pending_review', 'সিঙ্গেল ১'),
         ('p-single-2',  'missing-children',   'pending_review', 'সিঙ্গেল ২')`,
    ],
    "write",
  );
}

const statusOf = async (id: string): Promise<string> => {
  const { getClient } = await import("../client");
  const res = await getClient().execute({ sql: "SELECT status FROM posts WHERE id = ?", args: [id] });
  return String(res.rows[0]?.status ?? "");
};

const publishedAtOf = async (id: string): Promise<string | null> => {
  const { getClient } = await import("../client");
  const res = await getClient().execute({
    sql: "SELECT published_at FROM posts WHERE id = ?",
    args: [id],
  });
  return (res.rows[0]?.published_at as string | null) ?? null;
};

async function testApproveMixedCategories(): Promise<void> {
  const res = await bulkModeratePosts(
    ["p-double-1", "p-double-2", "p-single-1", "p-single-2"],
    "approved",
  );

  assert.equal(res.requested, 4, "every requested id is accounted for");
  assert.equal(res.updated.length, 4, "all four rows updated");
  assert.equal(res.missing.length, 0, "no rows reported missing");

  // Double-approval categories must be held, not silently published.
  assert.equal(res.needsSecondApproval.length, 2, "two posts held for a 2nd approval");
  assert.equal(res.published.length, 2, "the other two published immediately");
  assert.deepEqual(
    [...res.needsSecondApproval].sort(),
    ["p-double-1", "p-double-2"],
    "the held ids are the double-approval category",
  );

  assert.equal(await statusOf("p-double-1"), "approved", "held post is `approved`");
  assert.equal(await publishedAtOf("p-double-1"), null, "held post has no published_at");
  assert.equal(await statusOf("p-single-1"), "published", "single-approval post published");
  assert.ok(await publishedAtOf("p-single-1"), "published post gets published_at");
  console.log("ok - bulk approve honours per-category double approval");
}

async function testSecondApprovalPublishes(): Promise<void> {
  // Re-approving an already-`approved` post is the second sign-off: the
  // double-approval hold must not re-arm, so it goes straight to published.
  const res = await bulkModeratePosts(["p-double-1"], "approved");
  assert.equal(res.needsSecondApproval.length, 0, "second approval is not held again");
  assert.equal(res.published.length, 1, "second approval publishes");
  assert.equal(await statusOf("p-double-1"), "published", "post is now live");
  console.log("ok - second approval publishes without re-arming the hold");
}

async function testDirectPublishSkipsHold(): Promise<void> {
  const res = await bulkModeratePosts(["p-double-2"], "published");
  assert.equal(res.needsSecondApproval.length, 0, "explicit publish ignores the hold");
  assert.equal(await statusOf("p-double-2"), "published", "post is live");
  console.log("ok - explicit publish overrides the double-approval hold");
}

async function testRejectAndMissingIds(): Promise<void> {
  const res = await bulkModeratePosts(["p-single-2", "does-not-exist"], "rejected");
  assert.equal(res.rejected.length, 1, "the real row was rejected");
  assert.deepEqual(res.missing, ["does-not-exist"], "an unknown id is reported, not thrown");
  assert.equal(await statusOf("p-single-2"), "rejected", "row really is rejected");
  console.log("ok - a mixed selection reports missing ids instead of aborting");
}

async function testDedupeAndEmpty(): Promise<void> {
  const dupe = await bulkModeratePosts(["p-single-1", "p-single-1"], "rejected");
  assert.equal(dupe.requested, 2, "requested echoes the raw selection size");
  assert.equal(dupe.updated.length, 1, "the duplicate id is only updated once");

  const empty = await bulkModeratePosts([], "approved");
  assert.equal(empty.updated.length, 0, "empty selection is a no-op");
  assert.equal(empty.requested, 0, "empty selection reports zero");
  console.log("ok - duplicate and empty selections are safe");
}

async function testBulkDelete(): Promise<void> {
  const res = await bulkDeletePosts(["p-single-1", "does-not-exist"]);
  assert.deepEqual(res.deleted, ["p-single-1"], "existing row deleted");
  assert.deepEqual(res.missing, ["does-not-exist"], "unknown id reported");
  assert.equal(await statusOf("p-single-1"), "", "row is gone");
  console.log("ok - bulk delete removes rows and reports misses");
}

const tests: Array<[string, () => Promise<void>]> = [
  ["bulk approve honours per-category double approval", testApproveMixedCategories],
  ["second approval publishes", testSecondApprovalPublishes],
  ["explicit publish overrides hold", testDirectPublishSkipsHold],
  ["mixed selection reports missing ids", testRejectAndMissingIds],
  ["duplicate/empty selections are safe", testDedupeAndEmpty],
  ["bulk delete", testBulkDelete],
];

await seed();

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
  } catch (err) {
    failed++;
    console.error(`FAIL - ${name}:`, (err as Error).message);
  }
}

// The native libsql handle keeps the file locked on Windows, so close it before
// removing the temp DB and exit explicitly rather than letting V8 teardown
// report a spurious crash.
const { getClient } = await import("../client");
try {
  getClient().close();
} catch {
  /* ignore */
}
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  try {
    fs.rmSync(`${DB}${suffix}`, { force: true });
  } catch {
    /* best effort */
  }
}

console.log(`\n${tests.length - failed}/${tests.length} bulk moderation tests passed`);
if (failed > 0) process.exit(1);

/**
 * A removed or expired article must be gone from the public web, not just
 * "hidden by the listing".
 *
 * The public article page reads `posts_current_window`, so the guarantee is a
 * view property: a post that is `removed`, archived, or past the window is not
 * in it — meaning `/post/<slug>` renders Next's 404 instead of serving a page
 * the desk has taken down. The admin console keeps its own all-status lookup so
 * an operator can still inspect the record before retention purges it.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { __useClientForTests, applyMigration } from "../client";
import { baseSchemaSql } from "../migrations";
import { getPostBySlug, getPublicPostBySlug } from "../index";

const file = path.join(os.tmpdir(), `hoichoi-gone-${Date.now()}.db`);
const client = createClient({ url: `file:${file}` });
__useClientForTests(client);
await applyMigration(client, "001_init", baseSchemaSql());
// The public view CROSS JOINs `settings` for the window length: with no settings
// row the view is empty and every post would look gone.
await client.execute({
  sql: "INSERT OR IGNORE INTO settings (id, updated_at) VALUES (1, ?)",
  args: [new Date().toISOString()],
});

const now = new Date().toISOString();
const insert = async (id: string, slug: string, status: string, archivedAt: string | null): Promise<void> => {
  await client.execute({
    sql: `INSERT INTO posts (id, category, title_bn, body_bn, source_url, source_name, slug, status, safety_flags, created_at, updated_at, published_at, archived_at)
          VALUES (?, 'national', 'শিরোনাম', 'বিস্তারিত', 'https://src.example/a', 'সূত্র', ?, ?, '[]', ?, ?, ?, ?)`,
    args: [id, slug, status, now, now, now, archivedAt],
  });
};

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

await insert("p-live", "live-post", "published", null);
await insert("p-removed", "removed-post", "removed", null);
await insert("p-archived", "archived-post", "published", now);

await check("a published post is on the public web", async () => {
  assert.ok(await getPublicPostBySlug("live-post"));
});

await check("a removed post is not on the public web (404, not a hidden page)", async () => {
  assert.equal(await getPublicPostBySlug("removed-post"), null);
});

await check("an archived post is not on the public web either", async () => {
  assert.equal(await getPublicPostBySlug("archived-post"), null);
});

await check("a deleted slug has no public row at all", async () => {
  assert.equal(await getPublicPostBySlug("never-existed"), null);
});

await check("the admin console can still inspect a removed post before purge", async () => {
  const post = await getPostBySlug("removed-post");
  assert.ok(post);
  assert.equal(post?.status, "removed");
});

await check("the admin lookup also sees the archived record", async () => {
  assert.ok(await getPostBySlug("archived-post"));
});

console.log(`\n${passed} gone-post checks passed.`);
client.close();
try {
  fs.unlinkSync(file);
} catch {
  // temp file
}
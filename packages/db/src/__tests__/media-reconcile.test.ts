/**
 * Media orphan reconciliation, against a real database and a real temp directory.
 *
 * The whole value of this pass is that it deletes files. A mock would prove
 * nothing about the two rules that matter: never touch a file a post references,
 * and never touch a freshly written file (an upload may still be in flight).
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createClient } from "@libsql/client";
import { migrationSql } from "../migrations";
import { __useClientForTests } from "../client";
import { reconcileMedia, ORPHAN_AGE_GUARD_MS } from "../media-reconcile";
import { recordMediaObject } from "../media-objects";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const client = createClient({ url: ":memory:" });
__useClientForTests(client);
for (const name of ["001_init", "029_media_provider_health"]) {
  const ddl = migrationSql(name);
  assert.ok(ddl, `migration ${name} must exist`);
  const statements = ddl
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) await client.execute(stmt);
}
// Tables the scan reads that live outside the migrations (created at runtime).
await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS post_images (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL, path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image', position INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS raw_posts (
  id TEXT PRIMARY KEY, source_id TEXT, fb_post_id TEXT NOT NULL, fb_post_url TEXT NOT NULL,
  raw_text TEXT, media_urls TEXT NOT NULL DEFAULT '[]', screenshot_path TEXT, phash TEXT,
  scraped_at TEXT NOT NULL, raw_meta TEXT
);
CREATE TABLE IF NOT EXISTS media_objects (
  id TEXT PRIMARY KEY, adapter TEXT NOT NULL, key TEXT NOT NULL, url TEXT NOT NULL,
  post_id TEXT, bytes INTEGER, created_at TEXT NOT NULL
);
`);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "hoichoi-recon-"));
const writeFile = (rel: string, ageMs = 0, size = 16) => {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, Buffer.alloc(size, 1));
  const when = new Date(Date.now() - ageMs);
  fs.utimesSync(full, when, when);
};

const post = async (id: string, mediaPath: string | null) => {
  await client.execute({
    sql: `INSERT INTO posts (id, category, title_bn, body_bn, source_url, source_name, slug, status,
            safety_flags, created_at, updated_at, media_path, media_kind)
          VALUES (?, 'national', 'শিরোনাম', 'বডি', 'https://x.example/p', 'X', ?, 'published', '[]', ?, ?, ?, 'image')`,
    args: [id, `slug-${id}`, new Date().toISOString(), new Date().toISOString(), mediaPath],
  });
};

await post("p1", "2026/a.jpg");
writeFile("2026/a.jpg");                                  // referenced: keep
writeFile("2026/orphan-old.jpg", ORPHAN_AGE_GUARD_MS * 2); // unreferenced + old: delete
writeFile("2026/orphan-new.jpg", 60_000);                   // unreferenced + fresh: keep
await post("p2", "2026/missing.jpg");                       // referenced, no file
await recordMediaObject({ adapter: "github:owner/media", key: "media/2026/a.jpg", url: "https://cdn/a.jpg", post_id: "p1", bytes: 16 });
await recordMediaObject({ adapter: "github:owner/media", key: "media/2026/a.jpg", url: "https://cdn/a.jpg", post_id: "p1", bytes: 16 });
await recordMediaObject({ adapter: "s3:backblaze:media", key: "media/2026/gone.jpg", url: "https://cdn/gone.jpg", post_id: "deleted-post", bytes: 99 });

const dry = await reconcileMedia({ dryRun: true, rootOverride: root });

await check("a dry run classifies every class without touching the disk", () => {
  assert.ok(dry.byClass.unreferenced_local >= 2, JSON.stringify(dry.byClass));
  assert.equal(dry.byClass.missing_local, 1);
  assert.equal(dry.byClass.duplicate_remote_row, 1);
  assert.equal(dry.byClass.remote_row_without_post, 1);
  assert.equal(dry.deletedLocal.length, 0);
  assert.equal(dry.deletedRemoteRows, 0);
  assert.equal(fs.existsSync(path.join(root, "2026/orphan-old.jpg")), true);
});

await check("a referenced file is never listed as an orphan", () => {
  assert.equal(dry.items.some((i) => i.rel === "2026/a.jpg" && i.kind === "unreferenced_local"), false);
});

await check("a fresh unreferenced file is flagged but explained, not deleted", () => {
  const fresh = dry.items.find((i) => i.rel === "2026/orphan-new.jpg");
  assert.ok(fresh);
  assert.match(fresh!.detail, /guard/);
});

await check("cleanup deletes the old orphan and keeps everything referenced", async () => {
  const real = await reconcileMedia({ dryRun: false, rootOverride: root });
  assert.deepEqual(real.deletedLocal, ["2026/orphan-old.jpg"]);
  assert.equal(fs.existsSync(path.join(root, "2026/orphan-old.jpg")), false);
  assert.equal(fs.existsSync(path.join(root, "2026/a.jpg")), true, "referenced file must survive");
  assert.equal(fs.existsSync(path.join(root, "2026/orphan-new.jpg")), true, "fresh file must survive");
});

await check("cleanup removes the duplicate row and the post-less row", async () => {
  const left = await client.execute("SELECT adapter, key FROM media_objects ORDER BY adapter, key");
  assert.equal(left.rows.length, 1, JSON.stringify(left.rows));
  assert.equal(String((left.rows[0] as Record<string, unknown>).adapter), "github:owner/media");
});

await check("a second run is quiet", async () => {
  const again = await reconcileMedia({ dryRun: true, rootOverride: root });
  assert.equal(again.byClass.duplicate_remote_row, 0);
  assert.equal(again.byClass.remote_row_without_post, 0);
  // Only the fresh orphan and the genuinely missing path remain.
  assert.equal(again.byClass.unreferenced_local, 1);
  assert.equal(again.byClass.missing_local, 1);
  assert.equal(again.deletedLocal.length, 0);
});

await check("a queued post's screenshot is not an orphan", async () => {
  const scan = await reconcileMedia({ dryRun: true, rootOverride: root });
  assert.equal(
    scan.items.some((i) => i.rel === "shots/queued.png"),
    false,
    "raw_posts.screenshot_path must count as a reference",
  );
});

await check("external image URLs are not reported as missing local files", async () => {
  const scan = await reconcileMedia({ dryRun: true, rootOverride: root });
  assert.equal(
    scan.items.some((i) => i.rel.startsWith("https://")),
    false,
    "a CDN URL must not be classified as missing local media",
  );
});

await check("a missing media root is reported, not crashed on", async () => {
  const ghost = await reconcileMedia({ dryRun: true, rootOverride: path.join(root, "does-not-exist") });
  assert.equal(ghost.scannedLocalFiles, 0);
  assert.equal(ghost.byClass.missing_local, 2, "both referenced posts now look broken");
});

fs.rmSync(root, { recursive: true, force: true });
console.log(`[db] media-reconcile: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

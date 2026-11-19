/**
 * The rolling window and the retention clock.
 *
 * Both were broken in production for a month, and both failed the same way:
 * `strftime('%s', published_at)` returns **TEXT**, `strftime('%s','now') - n`
 * returns a **number**, and SQLite orders by storage class before value — every
 * TEXT is greater than every number. So the window's `>=` matched every row (the
 * live site served 1 451 posts, oldest 58 days old) and the rollover's `<` matched
 * none (the daily job reported success for a month while archiving nothing).
 *
 * These checks therefore run against a real database with real ISO-8601 `…Z`
 * timestamps, and they assert *counts*, not SQL text — a text comparison and a
 * numeric one look identical in a source file.
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { __useClientForTests } from "../client";
import { checkAndArchive, purgeExpired, runArchivePass } from "../archive";

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

await client.execute(`CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  archive_visible_days INTEGER NOT NULL DEFAULT 7,
  archive_retention_days INTEGER NOT NULL DEFAULT 30
)`);
await client.execute(`INSERT INTO settings (id, archive_visible_days, archive_retention_days) VALUES (1, 7, 30)`);
await client.execute(`CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'misc',
  title_bn TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  case_status TEXT,
  published_at TEXT,
  archived_at TEXT,
  archive_reason TEXT,
  legal_hold INTEGER NOT NULL DEFAULT 0,
  media_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);
await client.execute(`CREATE TABLE deletion_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  entity_id TEXT,
  reason TEXT,
  actor TEXT,
  detail_json TEXT,
  created_at TEXT
)`);
// The same view the migration creates — copied so a drift in either direction is
// visible here rather than only on the live database.
await client.execute(`CREATE VIEW posts_current_window AS
SELECT p.*,
  (CAST(strftime('%s', p.published_at) AS INTEGER) + (s.archive_visible_days * 86400)
   - CAST(strftime('%s','now') AS INTEGER)) * 1000 AS ttl_ms
FROM posts p CROSS JOIN settings s
WHERE p.status = 'published' AND p.archived_at IS NULL
  AND (
    (p.category = 'missing-children' AND p.case_status = 'active')
    OR CAST(strftime('%s', p.published_at) AS INTEGER)
       >= CAST(strftime('%s','now') AS INTEGER) - (s.archive_visible_days * 86400)
  )`);
// One row per setting below; the vec table is deliberately absent, because a local
// `file:` database has no vec0 module and a purge must still work there.
await client.execute(`CREATE TABLE posts_vec (post_id TEXT)`);

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

async function insert(fields: {
  id: string;
  publishedDaysAgo: number | null;
  archivedDaysAgo?: number | null;
  category?: string;
  caseStatus?: string | null;
  legalHold?: number;
}) {
  const published = fields.publishedDaysAgo === null ? null : daysAgo(fields.publishedDaysAgo);
  const archived =
    fields.archivedDaysAgo == null ? null : daysAgo(fields.archivedDaysAgo);
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO posts (id, category, title_bn, slug, status, case_status, published_at, archived_at, archive_reason, legal_hold, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      fields.id,
      fields.category ?? "misc",
      `শিরোনাম ${fields.id}`,
      `slug-${fields.id}`,
      fields.caseStatus ?? null,
      published,
      archived,
      archived ? "auto_rollover" : null,
      fields.legalHold ?? 0,
      now,
      now,
    ],
  });
}

async function main(): Promise<void> {
  // 2 days old (inside the window), 10 days old (outside), 40 days old archived
  // just now (the catch-up case), a held post, and an active case.
  await insert({ id: "fresh", publishedDaysAgo: 2 });
  await insert({ id: "stale", publishedDaysAgo: 10 });
  await insert({ id: "ancient", publishedDaysAgo: 40 });
  await insert({ id: "held", publishedDaysAgo: 10, legalHold: 1 });
  await insert({ id: "case", publishedDaysAgo: 60, category: "missing-children", caseStatus: "active" });

  await check("the window is seven days, and it is a number comparison", async () => {
    const res = await client.execute("SELECT id FROM posts_current_window ORDER BY id");
    const ids = res.rows.map((r) => String(r.id));
    assert.deepEqual(ids, ["case", "fresh"], "the window holds the fresh post and the live case only");
    assert.ok(!ids.includes("stale"), "a 10-day-old post is outside a 7-day window");
  });

  await check("ttl_ms is positive inside the window and negative outside", async () => {
    const res = await client.execute("SELECT id, ttl_ms FROM posts_current_window ORDER BY id");
    const ttl = new Map(res.rows.map((r) => [String(r.id), Number(r.ttl_ms)]));
    assert.ok((ttl.get("fresh") ?? 0) > 0, "fresh has time left");
    assert.ok((ttl.get("case") ?? 0) < 0, "an active case outlives its ttl");
  });

  await check("rollover archives what the window let go, and nothing else", async () => {
    const rolled = await checkAndArchive();
    // `stale` (10 days) and `ancient` (40 days) both roll over. `held` and `case`
    // are protected and `fresh` is still inside the window.
    assert.equal(rolled, 2, `the two old posts rolled over (got ${rolled})`);
    const res = await client.execute("SELECT id, archived_at, archive_reason FROM posts ORDER BY id");
    const rows = new Map(res.rows.map((r) => [String(r.id), r as unknown as Record<string, unknown>]));
    assert.ok(rows.get("stale")!.archived_at, "the stale post is archived");
    assert.equal(rows.get("stale")!.archive_reason, "auto_rollover");
    assert.ok(rows.get("ancient")!.archived_at, "so does the 40-day-old one");
    assert.equal(rows.get("fresh")!.archived_at, null, "the fresh post stays live");
    assert.equal(rows.get("held")!.archived_at, null, "legal hold is never rolled over");
    assert.equal(rows.get("case")!.archived_at, null, "an active missing-children case stays live");
  });

  await check("a second rollover is a no-op, not a re-archive", async () => {
    assert.equal(await checkAndArchive(), 0);
  });

  await check("the purge deletes the post that is older than the whole clock", async () => {
    // `ancient` was published 40 days ago and archived moments ago. Age 40 is past
    // 7 + 30, so it goes now — a backfilled archive does not earn another month.
    // `stale` is 10 days old and archived now: 10 < 37, so it stays.
    const report = await purgeExpired();
    assert.equal(report.purged, 1, `one post purged (got ${report.purged})`);
    assert.deepEqual(report.purgedIds, ["ancient"]);
    const res = await client.execute("SELECT id FROM posts ORDER BY id");
    assert.ok(!res.rows.map((r) => String(r.id)).includes("ancient"), "it is gone");
  });

  await check("every delete leaves a ledger row naming what went", async () => {
    const res = await client.execute(
      "SELECT entity_id, reason, actor, detail_json FROM deletion_log ORDER BY created_at",
    );
    assert.equal(res.rows.length, 1, "one deletion, one row");
    const row = res.rows[0] as unknown as Record<string, unknown>;
    assert.equal(String(row.entity_id), "ancient");
    assert.match(String(row.reason), /retention 30d/);
    assert.equal(String(row.actor), "archive:purge");
    const detail = JSON.parse(String(row.detail_json)) as { title_bn?: string; slug?: string };
    assert.equal(detail.slug, "slug-ancient", "the ledger can still say what the post was");
    assert.ok(detail.title_bn && detail.title_bn.length > 0);
  });

  await check("a held post is never purged, however old it is archived", async () => {
    await client.execute({
      sql: "UPDATE posts SET archived_at = ?, legal_hold = 1 WHERE id = 'held'",
      args: [daysAgo(400)],
    });
    assert.equal((await purgeExpired()).purged, 0, "legal hold blocks retention deletion");
    await client.execute("UPDATE posts SET legal_hold = 0 WHERE id = 'held'");
    assert.equal((await purgeExpired()).purged, 1, "and it goes once the hold is lifted");
  });

  await check("a full pass reports what it did", async () => {
    await insert({ id: "another-stale", publishedDaysAgo: 12 });
    await insert({ id: "another-ancient", publishedDaysAgo: 90 });
    const report = await runArchivePass();
    assert.equal(report.rolledOver, 2, "the two unarchived old posts roll over");
    assert.equal(report.purged, 1, "only the 90-day-old one is past 7 + 30");
    assert.deepEqual(report.purgedIds, ["another-ancient"]);
  });

  console.log(`\narchive window: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

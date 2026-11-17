/**
 * Ledger checks — the three records this batch added.
 *
 *  - `deletion_log`: what was deleted, why, by whom; never a silent loss.
 *  - `ai_task_runs`: every gateway call is a row, success or failure.
 *  - `settings.collection_paused`: the emergency stop, readable by the pipeline
 *    and writable only through the whitelisted update path.
 *
 * File-backed: libsql's `:memory:` client and its transaction path open separate
 * connections, so any test that exercises a transactional writer needs a file.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applyMigration, ensureAiProvenanceColumns, ensureAppConfigColumn, ensureBrandingColumns, ensureAdSlotColumns, ensureAdSlotInventory, ensureNoticesTable, __useClientForTests } from "../client";
import { baseSchemaSql, migrationSql } from "../migrations";
import { deletionCountFor, listDeletions, logDeletion } from "../deletion-log";
import { aiTaskSummary, listAiTaskRuns } from "../ai-runs";
import { getSettings, updateSettings } from "../index";

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

const file = path.join(os.tmpdir(), `hoichoi-ledgers-${Date.now()}.db`);
const client = createClient({ url: `file:${file}` });
__useClientForTests(client);

await applyMigration(client, "001_init", baseSchemaSql());
await ensureBrandingColumns(client);
await ensureAdSlotColumns(client);
await ensureAdSlotInventory(client);
await ensureAppConfigColumn(client);
await ensureNoticesTable(client);
for (const name of ["034_ai_provenance_and_ledgers"]) {
  const sql = migrationSql(name);
  assert.ok(sql, `migration ${name} must exist`);
  await applyMigration(client, name, sql);
}
// Columns live in a PRAGMA-guarded helper (SQLite has no ADD COLUMN IF NOT
// EXISTS), so a fresh schema needs it exactly like an upgrade does.
await ensureAiProvenanceColumns(client);

await check("a deletion is recorded with reason, actor and detail", async () => {
  await logDeletion({
    entityType: "post",
    entityId: "p-1",
    reason: "retention 30d",
    actor: "archive:purge",
    detail: { title_bn: "একটি শিরোনাম", slug: "ekti-shironam" },
  });
  const rows = await listDeletions(10);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.entityType, "post");
  assert.equal(rows[0]?.reason, "retention 30d");
  assert.equal(rows[0]?.actor, "archive:purge");
  assert.equal(rows[0]?.detail?.slug, "ekti-shironam");
});

await check("an unknown entity type is refused by the schema", async () => {
  await assert.rejects(
    logDeletion({ entityType: "spaceship" as unknown as "post", entityId: "x" }),
    /CHECK|constraint/i,
  );
});

await check("count for one entity reflects only that entity", async () => {
  assert.equal(await deletionCountFor("post", "p-1"), 1);
  assert.equal(await deletionCountFor("post", "p-2"), 0);
});

await check("the same id under two entity types does not collide", async () => {
  await logDeletion({ entityType: "media", entityId: "p-1", reason: "orphan" });
  assert.equal(await deletionCountFor("media", "p-1"), 1);
  assert.equal(await deletionCountFor("post", "p-1"), 1);
});

await check("reason is bounded so a paste cannot bloat the row", async () => {
  await logDeletion({ entityType: "comment", entityId: "c-1", reason: "ক".repeat(900) });
  const [row] = await listDeletions(1);
  assert.equal(row?.reason?.length, 500);
});

await check("two deletions in the same millisecond still read newest-first", async () => {
  // `created_at` is a millisecond string, so a burst ties; without a tie-break the
  // "latest deletion" surface returned whichever row SQLite happened to hand back,
  // which is how this passed locally and failed in CI.
  const same = new Date().toISOString();
  for (const [id, reason] of [["tie-a", "প্রথম"], ["tie-b", "দ্বিতীয়"]] as const) {
    await client.execute({
      sql: `INSERT INTO deletion_log (id, entity_type, entity_id, reason, actor, detail_json, created_at)
            VALUES (?, 'comment', ?, ?, 'admin@hoichoi.io', NULL, ?)`,
      args: [id, id, reason, same],
    });
  }
  const rows = await listDeletions(2);
  assert.equal(rows[0]?.reason, "দ্বিতীয়");
  assert.equal(rows[1]?.reason, "প্রথম");
});

await check("an AI run is recorded with provider and output size", async () => {
  await client.execute({
    sql: `INSERT INTO ai_task_runs (id, task, provider, model, input_chars, output_chars, latency_ms, ok, actor, created_at)
          VALUES ('r1','summarise','Google Gemini','gemini-3.6-flash',900,140,1500,1,'admin@hoichoi.io',?)`,
    args: [new Date().toISOString()],
  });
  const rows = await listAiTaskRuns(10);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.task, "summarise");
  assert.equal(rows[0]?.ok, true);
  assert.equal(rows[0]?.inputChars, 900);
});

await check("a failed run is visible as a failure, not silence", async () => {
  await client.execute({
    sql: `INSERT INTO ai_task_runs (id, task, provider, input_chars, output_chars, latency_ms, ok, error_kind, created_at)
          VALUES ('r2','draft','unresolved',40,0,0,0,'timeout',?)`,
    args: [new Date().toISOString()],
  });
  const summary = await aiTaskSummary();
  assert.equal(summary.calls, 2);
  assert.equal(summary.failures, 1);
  assert.ok(summary.totalChars >= 940);
});

await check("the summary can be scoped to one task", async () => {
  const summary = await aiTaskSummary("summarise");
  assert.equal(summary.calls, 1);
  assert.equal(summary.failures, 0);
});

// The ALTERs in 034 need a settings row to write to; production seeds it in 001.
// A test database must not silently pass by updating zero rows.
await client.execute({
  sql: "INSERT OR IGNORE INTO settings (id, updated_at) VALUES (1, ?)",
  args: [new Date().toISOString()],
});
const seeded = await client.execute("SELECT COUNT(*) AS n FROM settings WHERE id = 1");
assert.equal(Number((seeded.rows[0] as Record<string, unknown>).n), 1, "settings row 1 must exist");

await check("collection starts un-paused on a fresh database", async () => {
  const settings = await getSettings();
  assert.equal(settings.collection_paused, 0);
  assert.equal(settings.collection_paused_reason, null);
});

await check("pausing stores the switch and the reason", async () => {
  await updateSettings({ collection_paused: 1, collection_paused_reason: "ভুল খবর ছড়াচ্ছে" });
  const settings = await getSettings();
  assert.equal(settings.collection_paused, 1);
  assert.equal(settings.collection_paused_reason, "ভুল খবর ছড়াচ্ছে");
});

await check("resuming clears the flag", async () => {
  await updateSettings({ collection_paused: 0, collection_paused_reason: null });
  assert.equal((await getSettings()).collection_paused, 0);
});

await check("any value other than 1 reads as not-paused", async () => {
  await client.execute("UPDATE settings SET collection_paused = 7 WHERE id = 1");
  assert.equal((await getSettings()).collection_paused, 0);
});

await check("AI provenance columns exist on posts and default to human", async () => {
  await client.execute({
    sql: `INSERT INTO posts (id, category, title_bn, body_bn, source_url, source_name, slug, status, safety_flags, created_at, updated_at)
          VALUES ('p-2','national','শিরোনাম','বিস্তারিত','https://src.example/a','সূত্র','slug-2','published','[]',?,?)`,
    args: [new Date().toISOString(), new Date().toISOString()],
  });
  const row = (await client.execute("SELECT ai_assisted, ai_prompt_version FROM posts WHERE id = 'p-2'")).rows[0] as Record<string, unknown>;
  assert.equal(row.ai_assisted, 0);
  assert.equal(row.ai_prompt_version, null);
});

console.log(`\n${passed} ledger checks passed.`);
client.close();
try {
  fs.unlinkSync(file);
} catch {
  // Windows holds the handle for a beat; a temp file left behind is harmless.
}
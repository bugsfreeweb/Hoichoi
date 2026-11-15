/**
 * Audit trail behaviour against a real (in-memory) database.
 *
 * Two things are actually at risk and worth pinning:
 *  1. the actor snapshot (email + role) is stored on the row, so deleting a user
 *     later does not erase who did the thing;
 *  2. legacy INSERTs that never learned the new columns still get an actor,
 *     via the backfill trigger — otherwise half the trail would be anonymous.
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { countAudit, listAudit, recordAudit } from "../audit";
import { applyMigration } from "../client";
import { migrationSql } from "../migrations";

const client = createClient({ url: ":memory:" });

// Full 001 is the cheapest way to get the real `admin_actions` shape (plus its
// foreign keys); 026 adds the actor columns and the backfill trigger.
for (const name of ["001_init", "026_admin_actions_actor"]) {
  const sql = migrationSql(name);
  assert.ok(sql, `migration ${name} must exist`);
  await applyMigration(client, name, sql);
}

await client.execute({
  sql: "INSERT INTO admin_users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  args: ["u1", "editor@hoichoi.local", "x", "সম্পাদক", "editor", "2026-01-01T00:00:00.000Z"],
});

let passed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const ok = await recordAudit({
  actorId: "u1",
  actorEmail: "editor@hoichoi.local",
  actorRole: "editor",
  action: "post.update",
  entityType: "post",
  entityId: "p1",
  summary: "শিরোনাম বদলানো হয়েছে",
  metadata: { fields: ["title_bn"] },
  ipHash: "abc123",
}, client);

await check("recordAudit reports success", async () => {
  assert.equal(ok, true);
});

await check("the actor snapshot is stored on the row, not only as a foreign key", async () => {
  const rows = await client.execute("SELECT * FROM admin_actions WHERE action = 'post.update'");
  assert.equal(rows.rows.length, 1);
  const row = rows.rows[0] as Record<string, unknown>;
  assert.equal(row.actor_email, "editor@hoichoi.local");
  assert.equal(row.actor_role, "editor");
  assert.equal(row.ip_hash, "abc123");
  assert.equal(row.target_table, "post");
  assert.equal(row.target_id, "p1");
  const details = JSON.parse(String(row.details)) as Record<string, unknown>;
  assert.equal(details.summary, "শিরোনাম বদলানো হয়েছে");
  assert.deepEqual(details.fields, ["title_bn"]);
});

await check("a legacy INSERT without the new columns still records its actor", async () => {
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: ["legacy1", "u1", "post.delete", "posts", "p2", "{}", "2026-01-02T00:00:00.000Z"],
  });
  const row = (
    await client.execute("SELECT actor_email, actor_role FROM admin_actions WHERE id = 'legacy1'")
  ).rows[0] as Record<string, unknown>;
  assert.equal(row.actor_email, "editor@hoichoi.local", "the trigger must backfill the email");
  assert.equal(row.actor_role, "editor");
});

await check("the trail is ordered newest first", async () => {
  await recordAudit({
    actorId: "u1",
    actorEmail: "editor@hoichoi.local",
    actorRole: "editor",
    action: "post.update",
    entityType: "post",
    entityId: "p1",
    summary: "দ্বিতীয় পরিবর্তন",
  }, client);
  const rows = await listAudit({ limit: 5 }, client);
  assert.ok(rows.length >= 3);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1]!.created_at >= rows[i]!.created_at, "rows must descend by created_at");
  }
});

await check("filters narrow by action and actor", async () => {
  assert.equal(await countAudit({ action: "post.update" }, client), 2);
  assert.equal(await countAudit({ action: "post.delete" }, client), 1);
  assert.equal(await countAudit({ actorEmail: "editor@hoichoi.local" }, client), 3);
  assert.equal(await countAudit({ actorEmail: "nobody@hoichoi.local" }, client), 0);
  const rows = await listAudit({ action: "post.delete", limit: 5 }, client);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.entity_id, "p2");
});

await check("a very long summary is truncated instead of overflowing the row", async () => {
  await recordAudit({
    actorId: "u1",
    actorEmail: "editor@hoichoi.local",
    actorRole: "editor",
    action: "post.update",
    entityType: "post",
    entityId: "p3",
    summary: "ক".repeat(900),
  }, client);
  const row = (
    await client.execute("SELECT details FROM admin_actions WHERE target_id = 'p3'")
  ).rows[0] as Record<string, unknown>;
  assert.ok(String(row.details).length <= 4100);
});

await check("a broken audit write returns false instead of throwing", async () => {
  const okWrite = await recordAudit({
    actorId: null,
    actorEmail: "",
    actorRole: "editor",
    action: "x",
    entityType: "y",
    summary: "empty email must not crash the caller",
  }, client);
  assert.equal(typeof okWrite, "boolean");
});

console.log(`[db] audit: ${passed} checks passed`);

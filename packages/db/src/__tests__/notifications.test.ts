/**
 * Admin notifications.
 *
 * The two behaviours that matter: the same condition must not produce a row per
 * run (or the bell becomes noise), and a row must never be visible to a role
 * below its `role_min` (a moderator should not read admin-only alerts).
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { __useClientForTests } from "../client";
import { migrationSql } from "../migrations";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsEmailed,
  notify,
  pendingEmailNotifications,
} from "../admin-notifications";

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
const ddl = migrationSql("030_admin_notifications");
assert.ok(ddl, "migration 030_admin_notifications must exist");
for (const stmt of ddl
  .replace(/^\s*--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)) {
  await client.execute(stmt);
}

await check("one event produces one row, however often it is reported", async () => {
  const first = await notify({
    kind: "provider",
    severity: "warn",
    title_bn: "প্রোভাইডার বিরতিতে",
    body_bn: "401",
    href: "/admin/media",
    dedupeKey: "provider:github:a:cooldown:2026-01-01T00:10:00Z",
  });
  assert.ok(first, "the first call must create the row");
  const again = await notify({
    kind: "provider",
    severity: "warn",
    title_bn: "প্রোভাইডার বিরতিতে",
    dedupeKey: "provider:github:a:cooldown:2026-01-01T00:10:00Z",
  });
  assert.equal(again, null, "a duplicate condition must not add a row");
  assert.equal((await listNotifications({ limit: 10 })).length, 1);
});

await check("a different dedupe key is a different event", async () => {
  await notify({
    kind: "provider",
    severity: "warn",
    title_bn: "আরেক প্রোভাইডার",
    dedupeKey: "provider:s3:b:cooldown:2026-01-01T00:10:00Z",
  });
  assert.equal((await listNotifications({ limit: 10 })).length, 2);
});

await check("alerts are newest first and respect role_min", async () => {
  await notify({
    kind: "security",
    severity: "critical",
    title_bn: "শুধু অ্যাডমিনের জন্য",
    roleMin: "admin",
    dedupeKey: "security:admin-only",
  });
  const modView = await listNotifications({ limit: 10, roleMin: "moderator" });
  assert.equal(modView.some((n) => n.title_bn.includes("অ্যাডমিন")), false);
  const adminView = await listNotifications({ limit: 10, roleMin: "admin" });
  assert.equal(adminView.some((n) => n.title_bn.includes("অ্যাডমিন")), true);
  assert.ok(adminView[0]!.created_at >= adminView[adminView.length - 1]!.created_at);
});

await check("unread counts, single read and mark-all behave", async () => {
  assert.equal(await countUnreadNotifications("admin"), 3);
  const list = await listNotifications({ limit: 10, roleMin: "admin" });
  const target = list[0]!;
  assert.equal(await markNotificationRead(target.id), true);
  assert.equal(await countUnreadNotifications("admin"), 2);
  assert.equal(await markNotificationRead(target.id), false, "already read is a no-op");
  await markAllNotificationsRead("admin");
  assert.equal(await countUnreadNotifications("admin"), 0);
});

await check("only warn/critical are queued for email", async () => {
  await notify({ kind: "media", severity: "info", title_bn: "শুধু তথ্য", dedupeKey: "media:info" });
  await notify({ kind: "pipeline", severity: "critical", title_bn: "ক্রন ব্যর্থ", dedupeKey: "cron:fail" });
  const pending = await pendingEmailNotifications(20);
  const titles = pending.map((p) => p.title_bn);
  assert.ok(titles.includes("ক্রন ব্যর্থ"));
  assert.equal(titles.includes("শুধু তথ্য"), false, "info rows must not be mailed");
  assert.ok(pending.every((p) => p.severity !== "info"));
  await markNotificationsEmailed(pending.map((p) => p.id));
  assert.equal((await pendingEmailNotifications(20)).length, 0, "stamped rows drop out of the queue");
});

await check("long text is clamped so a bad string cannot fill the bell", async () => {
  await notify({
    kind: "pipeline",
    severity: "warn",
    title_bn: "শিরোনাম " + "ক".repeat(400),
    body_bn: "বডি " + "খ".repeat(900),
    dedupeKey: "pipeline:long",
  });
  const rows = await listNotifications({ limit: 5 });
  const row = rows[0]!;
  assert.ok(row.title_bn.length <= 160);
  assert.ok((row.body_bn ?? "").length <= 400);
});

console.log(`[db] notifications: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

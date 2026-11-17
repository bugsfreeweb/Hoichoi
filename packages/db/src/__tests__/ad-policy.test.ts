/**
 * No ad goes live without a human saying it may.
 *
 * The old activation was one UPDATE: anyone who could click could put a creative
 * in front of readers and the only evidence was a status column. These checks pin
 * the refusal (an incomplete checklist throws with the operator's own wording),
 * the record (reviewer + ticks + notes, kept as history rather than overwritten),
 * and the wiring (the console collects the ticks and the audit names the actor).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applyMigration, __useClientForTests } from "../client";
import { migrationSql } from "../migrations";
import { AD_POLICY_CHECKS, AD_POLICY_KEYS, assertPolicyComplete, latestApproval, listAdPolicyReviews, recordAdPolicyReview } from "../ad-policy";
import { listAllAdBookings, setAdBookingStatus } from "../ads";

const root = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const web = (rel: string): string => fs.readFileSync(path.join(root, "apps", "web", rel), "utf8");

let passed = 0;
async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const file = path.join(os.tmpdir(), `hoichoi-adpolicy-${Date.now()}.db`);
const client = createClient({ url: `file:${file}` });
__useClientForTests(client);
await client.executeMultiple(`
CREATE TABLE ad_bookings (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL, creative_id TEXT NOT NULL, slot_key TEXT NOT NULL,
  starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, days INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft', priority INTEGER NOT NULL DEFAULT 0,
  gross_bdt INTEGER NOT NULL DEFAULT 0, discount_bdt INTEGER NOT NULL DEFAULT 0,
  vat_bdt INTEGER NOT NULL DEFAULT 0, total_bdt INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
`);
const reviewsSql = migrationSql("037_ad_policy_reviews");
assert.ok(reviewsSql, "migration 037 must exist");
await applyMigration(client, "037_ad_policy_reviews", reviewsSql);

const now = new Date().toISOString();
await client.execute({
  sql: `INSERT INTO ad_bookings (id, client_id, creative_id, slot_key, starts_at, ends_at, days, status, created_at, updated_at)
        VALUES ('b1', 'c1', 'cr1', 'home-top', ?, ?, 3, 'draft', ?, ?)`,
  args: [now, now, now, now],
});

await check("the checklist covers the five rules an ad must pass", () => {
  assert.equal(AD_POLICY_KEYS.length, 5);
  for (const key of AD_POLICY_KEYS) assert.ok(AD_POLICY_CHECKS[key], `missing wording for ${key}`);
});

await check("an incomplete checklist is refused, and says what is missing", () => {
  assert.throws(() => assertPolicyComplete({ creative_rights: true }), /নীতি-যাচাই/);
  assert.throws(() => assertPolicyComplete(undefined), /নীতি-যাচাই/);
});

await check("a complete checklist passes", () => {
  const all = Object.fromEntries(AD_POLICY_KEYS.map((k) => [k, true]));
  assert.doesNotThrow(() => assertPolicyComplete(all));
});

/** Read the booking back through the public list (there is no by-id reader). */
const booking = async (id: string) => (await listAllAdBookings()).find((b) => b.id === id);

await check("activation without a reviewer is refused", async () => {
  await assert.rejects(setAdBookingStatus("b1", "active", { actor: "" }), /অনুমোদনকারীর পরিচয়/);
  assert.equal((await booking("b1"))?.status, "draft", "a refused activation must not change the status");
});

await check("activation with an incomplete checklist is refused and leaves no review", async () => {
  await assert.rejects(setAdBookingStatus("b1", "active", { actor: "admin@x.io", checks: {} }), /নীতি-যাচাই/);
  assert.equal((await listAdPolicyReviews("b1")).length, 0);
  assert.equal((await booking("b1"))?.status, "draft");
});

await check("a complete activation goes live and stores the review", async () => {
  const checks = Object.fromEntries(AD_POLICY_KEYS.map((k) => [k, true]));
  await setAdBookingStatus("b1", "active", { actor: "admin@x.io", checks, notes: "ক্রিয়েটিভ দেখা হয়েছে" });
  assert.equal((await booking("b1"))?.status, "active");
  const reviews = await listAdPolicyReviews("b1");
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0]?.reviewer, "admin@x.io");
  assert.equal(reviews[0]?.decision, "approved");
  assert.equal(reviews[0]?.notes, "ক্রিয়েটিভ দেখা হয়েছে");
});

await check("the approval is retrievable as the booking's current approval", async () => {
  const approval = await latestApproval("b1");
  assert.ok(approval);
  assert.equal(approval?.reviewer, "admin@x.io");
});

await check("a second review is history, not an overwrite", async () => {
  await setAdBookingStatus("b1", "rejected", { actor: "admin@x.io", notes: "নীতি লঙ্ঘন" });
  const reviews = await listAdPolicyReviews("b1");
  assert.equal(reviews.length, 2, "the earlier approval must survive the rejection");
  assert.equal((await latestApproval("b1"))?.decision, "approved");
  assert.equal((await booking("b1"))?.status, "rejected");
});

await check("rejection needs no checklist", async () => {
  await client.execute({
    sql: `INSERT INTO ad_bookings (id, client_id, creative_id, slot_key, starts_at, ends_at, days, status, created_at, updated_at)
          VALUES ('b2','c1','cr1','home-top',?,?,1,'draft',?,?)`,
    args: [now, now, now, now],
  });
  await setAdBookingStatus("b2", "rejected", { actor: "admin@x.io", notes: "স্পষ্ট প্রতারণা" });
  assert.equal((await booking("b2"))?.status, "rejected");
  const reviews = await listAdPolicyReviews("b2");
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0]?.decision, "rejected");
});

await check("the console collects the ticks and the action names the actor", () => {
  const page = web("src/app/admin/(console)/ads/page.tsx");
  const action = web("src/app/admin/(console)/ads/actions.ts");
  assert.match(page, /AD_POLICY_KEYS\.map/);
  assert.match(page, /policy_\$\{key\}/);
  assert.match(page, /required/);
  assert.match(action, /actor: user\.email/);
  assert.match(action, /policy_checks/);
});

await check("activation is audited", () => {
  const action = web("src/app/admin/(console)/ads/actions.ts");
  assert.match(action, /action: status === "active" \? "ad\.booking\.activate"/);
});

console.log(`\n${passed} ad-policy checks passed.`);
client.close();
try {
  fs.unlinkSync(file);
} catch {
  // temp file
}
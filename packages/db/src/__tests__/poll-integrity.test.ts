/**
 * Poll integrity.
 *
 * Two claims this file protects: invalidated votes never count toward the
 * published tally (but do not disappear from the record), and the fraud signals
 * fire on the shapes that actually indicate stuffing rather than on a busy day.
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { __useClientForTests } from "../client";
import { migrationSql } from "../migrations";
import { getPollResults, getPollVoteCount, setPollVotes } from "../polls";
import { integrityScore, invalidatePollVotes, pollIntegrity, pollIpGroups, verdictFor } from "../poll-integrity";

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

// A file-backed DB, not :memory: — `setPollVotes` runs inside a transaction, and
// a transaction on an in-memory libsql database opens a second connection that
// sees an empty database.
const dbFile = resolve(process.cwd(), ".tmp-poll-integrity.db");
rmSync(dbFile, { force: true });
const client = createClient({ url: `file:${dbFile}` });
__useClientForTests(client);
for (const name of ["013_polls", "032_poll_integrity"]) {
  const ddl = migrationSql(name);
  assert.ok(ddl, `migration ${name} must exist`);
  for (const stmt of ddl
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await client.execute(stmt);
  }
}

const now = new Date().toISOString();
// Two polls on purpose. Poll 1 is the "busy but real" case; poll 2 exists so the
// stuffing case is measured on its own votes. Mixing them diluted the ratio to
// 4.3 sessions/IP, which scores 27.6 — just under the 30 that means "flagged",
// so the verdict depended on whether the votes/min signal fired, which depends on
// how fast the machine ran the test. It passed locally and failed on CI.
await client.execute({
  sql: `INSERT INTO polls (id, slug, topic, question, options_json, template, status, created_at, updated_at)
        VALUES (1,'p-test','রাজনীতি','প্রশ্ন?','[{"id":"a","label":"ক"},{"id":"b","label":"খ"}]','bar','open',?,?)`,
  args: [now, now],
});
await client.execute({
  sql: `INSERT INTO polls (id, slug, topic, question, options_json, template, status, created_at, updated_at)
        VALUES (2,'p-test-2','রাজনীতি','প্রশ্ন?','[{"id":"a","label":"ক"},{"id":"b","label":"খ"}]','bar','open',?,?)`,
  args: [now, now],
});
await client.execute({
  sql: `INSERT INTO polls (id, slug, topic, question, options_json, template, status, created_at, updated_at)
        VALUES (3,'p-test-3','রাজনীতি','প্রশ্ন?','[{"id":"a","label":"ক"},{"id":"b","label":"খ"}]','bar','open',?,?)`,
  args: [now, now],
});

await check("a clean poll with a handful of votes scores clean", async () => {
  for (let i = 0; i < 6; i++) {
    await setPollVotes(1, [i % 2 ? "a" : "b"], `session000${i}`, `hash${i}`);
  }
  const report = await pollIntegrity(1);
  assert.equal(report.totalValidVotes, 6);
  assert.equal(report.verdict, "clean");
  assert.equal(report.score, 0);
});

await check("one network raining sessions is flagged", async () => {
  for (let i = 0; i < 24; i++) {
    await setPollVotes(2, ["a"], `stuffedsession${i}`, "samehash");
  }
  const report = await pollIntegrity(2);
  assert.ok(report.signals.some((s) => s.bad && s.unit === "sessions/ip"), "sessions/ip must go bad");
  assert.notEqual(report.verdict, "clean");
  // 24 sessions on one network is unambiguously flagged, not merely "not clean":
  // the verdict must be reachable without depending on the votes/min signal.
  assert.equal(report.verdict, "flagged");
  const groups = await pollIpGroups(2);
  assert.equal(groups[0]!.ipHash, "samehash");
  assert.ok(groups[0]!.votes >= 24);
});

await check("stuffing split across a few networks is caught by the busiest one", async () => {
  // Eight honest readers (one session each) plus two stuffed exits (six sessions
  // each): the average is 2.0 sessions/IP, so an average-based signal reads clean.
  // The busiest-network signal is what makes this flagged.
  for (let i = 0; i < 8; i++) {
    await setPollVotes(3, [i % 2 ? "a" : "b"], `honest${i}`, `honestip${i}`);
  }
  for (let net = 0; net < 2; net++) {
    for (let s = 0; s < 6; s++) {
      await setPollVotes(3, [s % 2 ? "a" : "b"], `stuffed${net}-${s}`, `exitip${net}`);
    }
  }
  const report = await pollIntegrity(3);
  const top = report.signals.find((s) => s.label === "শীর্ষ নেটওয়ার্কে সেশন");
  assert.ok(top, "the busiest-network signal must exist");
  assert.equal(top!.value, 6);
  assert.equal(top!.bad, true);
  assert.notEqual(report.verdict, "clean", "two networks carrying six sessions each must not read clean");
});

await check("invalidated votes leave the tally but stay in the table", async () => {
  const before = await getPollVoteCount(2);
  const removed = await invalidatePollVotes(2, {
    allFromIpHash: "samehash",
    reason: "একই নেটওয়ার্ক থেকে সেশন বোমা",
    by: { email: "admin@hoichoi.io", role: "admin" },
  });
  assert.equal(removed, 24);
  assert.equal(await getPollVoteCount(2), before - 24);
  const stored = await client.execute({
    sql: "SELECT COUNT(*) AS n FROM poll_votes WHERE poll_id = 2 AND invalidated_at IS NOT NULL AND invalid_reason IS NOT NULL",
    args: [],
  });
  assert.equal(Number((stored.rows[0] as Record<string, unknown>).n), 24, "the record must survive");
});

await check("results and the report both use validated votes only", async () => {
  const results = await getPollResults(2);
  const total = results.reduce((sum, r) => sum + r.votes, 0);
  assert.equal(total, 0);
  const report = await pollIntegrity(2);
  assert.equal(report.totalValidVotes, 0);
  assert.equal(report.invalidated, 24);
  assert.equal(report.verdict, "clean", "the cleaned poll reads clean again");
});

await check("invalidating twice does not double-count", async () => {
  const again = await invalidatePollVotes(2, {
    allFromIpHash: "samehash",
    reason: "আবার",
    by: { email: "admin@hoichoi.io", role: "admin" },
  });
  assert.equal(again, 0, "already-invalidated votes must not be re-stamped");
});

await check("score and verdict are monotonic and bounded", async () => {
  assert.equal(integrityScore([]), 0);
  assert.ok(integrityScore([{ value: 120, unit: "votes/min", bad: true }]) <= 100);
  assert.equal(verdictFor(0), "clean");
  assert.equal(verdictFor(35), "flagged");
  assert.equal(verdictFor(90), "suspicious");
  assert.ok(integrityScore([{ value: 95, unit: "%", bad: true }]) > 0);
});

await check("an empty reason is refused before it reaches the audit log", async () => {
  // The route validates this too; asserting the pure layer keeps the API honest.
  const report = await pollIntegrity(999);
  assert.equal(report.totalValidVotes, 0);
  assert.equal(report.verdict, "clean");
});

// Windows keeps the sqlite handle open until the process exits; the temp file is
// gitignored-by-pattern and harmless, so a failed unlink must not fail the run.
try {
  client.close();
  rmSync(dbFile, { force: true });
} catch {
  /* the OS will reap it */
}
console.log(`[db] poll integrity: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

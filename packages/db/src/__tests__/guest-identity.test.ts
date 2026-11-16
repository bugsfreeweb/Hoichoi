/**
 * Guest identity, trust and data-subject erasure.
 *
 * The properties that matter: the columns never hold the raw address, the same
 * guest is matchable across tables, the trust score is a bounded signal rather
 * than a verdict, and an erase removes exactly that guest's public rows.
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { __useClientForTests } from "../client";
import { migrationSql } from "../migrations";
import {
  computeTrustScore,
  eraseGuestData,
  exportGuestData,
  hashEmail,
  hashIp,
  identityFor,
  trustScoreFor,
} from "../guest";

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

for (const name of ["001_init", "004_live_site", "031_guest_identity"]) {
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

const EMAIL = "Reader@Example.COM ";

await check("the email hash is normalised, stable and not the address", async () => {
  const a = hashEmail(EMAIL);
  const b = hashEmail(" reader@example.com");
  assert.ok(a && a.length === 64);
  assert.equal(a, b, "case and whitespace must not change the identity");
  assert.equal(a!.includes("reader"), false);
  assert.equal(hashEmail("not-an-email"), null);
  assert.equal(hashEmail(""), null);
});

await check("the ip hash is truncated to a neighbourhood, not the exact host", async () => {
  const a = hashIp("203.0.113.42");
  const b = hashIp("203.0.113.99");
  assert.equal(a, b, "two hosts in one /24 must hash the same");
  assert.notEqual(a, hashIp("198.51.100.7"));
  assert.equal(hashIp(""), null);
});

await check("trust is bounded and moves the right way", async () => {
  assert.equal(computeTrustScore({ acceptedComments: 0, rejectedComments: 0, acceptedReports: 0, rejectedReports: 0 }), 50);
  const good = computeTrustScore({ acceptedComments: 5, rejectedComments: 0, acceptedReports: 2, rejectedReports: 0 });
  const bad = computeTrustScore({ acceptedComments: 0, rejectedComments: 5, acceptedReports: 0, rejectedReports: 2 });
  assert.ok(good > 50 && bad < 50);
  assert.ok(good <= 100 && bad >= 0);
  const floor = computeTrustScore({ acceptedComments: 0, rejectedComments: 99, acceptedReports: 0, rejectedReports: 99 });
  assert.equal(floor, 0, "a hostile guest must not go negative");
});

await check("a guest with no history has no score (never a fake 50)", async () => {
  assert.equal(await trustScoreFor("freshguestid0000000000"), null);
  assert.equal(await trustScoreFor(null), null);
});

// A real post, because comments/reports carry a foreign key to posts.
await client.execute({
  sql: `INSERT INTO posts (id, title_bn, slug, body_bn, category, source_url, source_name, status, created_at, updated_at)
        VALUES ('p1','শিরোনাম','slug-one','বডি','national','https://facebook.com/posts/1','পেজ','published','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')`,
  args: [],
});

await check("two rows for one guest link by guest id and by email hash", async () => {
  const guestId = "guest_abandoned_cart01";
  await client.execute({
    sql: `INSERT INTO comments (id, post_id, author, body, likes, status, created_at, guest_id, email_hash, trust_score)
          VALUES ('c1','p1','ক','প্রথম',0,'approved','2026-01-01T00:00:00Z',?,?,NULL)`,
    args: [guestId, hashEmail(EMAIL)],
  });
  await client.execute({
    sql: `INSERT INTO reader_reports (id, post_id, reporter_name, reporter_email, reason, status, created_at, guest_id, email_hash)
          VALUES ('r1','p1','ক',?,'ভুল তথ্য','reviewed','2026-01-02T00:00:00Z',NULL,?)`,
    args: [EMAIL.trim(), hashEmail(EMAIL)],
  });
  const byId = await exportGuestData({ guestId });
  assert.equal(byId.comments.length, 1);
  assert.equal(byId.reports.length, 1, "the emailed report must match through the hash");
  const byEmail = await exportGuestData({ email: EMAIL });
  assert.equal(byEmail.comments.length, 1);
  assert.equal(byEmail.reports.length, 1);
});

await check("the export omits routing hashes but keeps the human content", async () => {
  const data = await exportGuestData({ email: EMAIL });
  const comment = data.comments[0]!;
  assert.equal("email_hash" in comment, false);
  assert.equal("guest_id" in comment, false);
  assert.equal("ip_hash" in comment, false);
  assert.equal(comment.body, "প্রথম");
});

await check("a guest's history produces a score from real moderation outcomes", async () => {
  const score = await trustScoreFor("guest_abandoned_cart01");
  assert.equal(score, 55, "one approved comment (+5) over a base of 50");
});

await check("erase removes exactly that guest's rows and reports what it removed", async () => {
  await client.execute({
    sql: `INSERT INTO comments (id, post_id, author, body, likes, status, created_at, guest_id)
          VALUES ('c2','p1','অন্য','অন্য কারও',0,'approved','2026-01-03T00:00:00Z','someone_else_00001')`,
    args: [],
  });
  const counts = await eraseGuestData({ guestId: "guest_abandoned_cart01" });
  assert.deepEqual(counts, { comments: 1, reports: 1, submissions: 0, removals: 0 });
  const after = await exportGuestData({ guestId: "guest_abandoned_cart01" });
  assert.equal(after.comments.length + after.reports.length, 0);
  const others = await exportGuestData({ guestId: "someone_else_00001" });
  assert.equal(others.comments.length, 1, "another reader's row must survive");
});

await check("identityFor refuses to store a raw or too-short guest id", async () => {
  const identity = await identityFor({ guestId: "short", email: EMAIL, ip: "203.0.113.9" });
  assert.equal(identity.guestId, null);
  assert.ok(identity.emailHash && identity.ipHash);
  assert.equal(identity.trustScore, null);
});

await check("an empty identifier is an error, not a whole-table delete", async () => {
  await assert.rejects(() => eraseGuestData({}), TypeError);
  await assert.rejects(() => exportGuestData({}), TypeError);
});

console.log(`[db] guest identity: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

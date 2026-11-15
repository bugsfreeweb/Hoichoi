/**
 * Verification grades.
 *
 * The badge on a story is only honest if the grade is computed from records, so
 * these checks pin the refusals: one source can never become "multi-source",
 * "editor verified" needs a named editor, a disputed claim knocks the grade
 * down, and a post with nothing behind it stays "unverified" (no badge).
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { applyMigration } from "../client";
import { migrationSql } from "../migrations";
import {
  deleteClaim,
  gradeFromEvidence,
  listClaims,
  listCorrections,
  recordCorrection,
  setVerification,
  showsBadge,
  upsertClaim,
} from "../verification";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>): void | Promise<void> {
  const run = async () => {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (err) {
      console.error(`FAIL ${name}: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  };
  return run();
}

await check("one source is never multi-source", () => {
  assert.equal(gradeFromEvidence({ sourceCount: 1 }), "single_source");
  assert.equal(gradeFromEvidence({ sourceCount: 1, verifierName: "a@b.c" }), "single_source");
  assert.equal(gradeFromEvidence({ sourceCount: 2 }), "multi_source");
});

await check("editor verification needs a named editor", () => {
  assert.equal(gradeFromEvidence({ sourceCount: 2, verifierName: null }), "multi_source");
  assert.equal(gradeFromEvidence({ sourceCount: 2, verifierName: "  " }), "multi_source");
  assert.equal(gradeFromEvidence({ sourceCount: 2, verifierName: "editor@hoichoi.local" }), "human_verified");
});

await check("a disputed or false claim overrides everything", () => {
  assert.equal(
    gradeFromEvidence({ sourceCount: 5, verifierName: "editor@x", claims: [{ status: "disputed" }] }),
    "unverified",
  );
  assert.equal(gradeFromEvidence({ sourceCount: 5, claims: [{ status: "false" }] }), "unverified");
});

await check("supported claims do not inflate the grade on their own", () => {
  assert.equal(gradeFromEvidence({ sourceCount: 1, claims: [{ status: "supported" }] }), "single_source");
});

await check("no source at all is unverified", () => {
  assert.equal(gradeFromEvidence({ sourceCount: 0 }), "unverified");
});

await check("the badge is hidden for the two weak grades", () => {
  assert.equal(showsBadge("unverified"), false);
  assert.equal(showsBadge("single_source"), false);
  assert.equal(showsBadge("multi_source"), true);
  assert.equal(showsBadge("human_verified"), true);
  assert.equal(showsBadge("corrected"), true);
  assert.equal(showsBadge(null), false);
});

/* ---------- storage ---------- */

const client = createClient({ url: ":memory:" });
for (const name of ["001_init", "028_verification"]) {
  const sql = migrationSql(name);
  assert.ok(sql, `migration ${name} must exist`);
  await applyMigration(client, name, sql);
}

await client.execute({
  sql: `INSERT INTO posts (id, category, title_bn, body_bn, source_url, source_name, slug, status, safety_flags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: ["p1", "national", "শিরোনাম", "বিস্তারিত", "https://src.example/a", "সূত্র", "slug-1", "published", "[]", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
});

await check("a new post defaults to unverified", async () => {
  const row = (await client.execute("SELECT verification_status FROM posts WHERE id = 'p1'")).rows[0] as Record<string, unknown>;
  assert.equal(row.verification_status, "unverified");
});

await check("claims and corrections persist against the post", async () => {
  const claim = await upsertClaim({ postId: "p1", claimBn: "দাবি এক", status: "supported", evidenceUrl: "https://ev.example/1" }, client);
  assert.equal((await listClaims("p1", client)).length, 1);
  const corrected = await recordCorrection({ postId: "p1", field: "title_bn", oldValue: "পুরনো", newValue: "নতুন", reason: "ভুল বানান", correctedBy: "editor@x" }, client);
  assert.equal(corrected.field, "title_bn");
  assert.equal((await listCorrections("p1", client))[0]!.reason, "ভুল বানান");
  await deleteClaim(claim.id, client);
  assert.equal((await listClaims("p1", client)).length, 0);
});

await check("setVerification stores the grade, note and verifier", async () => {
  await setVerification("p1", "human_verified", { note: "দুই সূত্র", verifierName: "editor@x" }, client);
  const row = (await client.execute("SELECT verification_status, verified_by, verification_note, verified_at FROM posts WHERE id = 'p1'")).rows[0] as Record<string, unknown>;
  assert.equal(row.verification_status, "human_verified");
  assert.equal(row.verified_by, "editor@x");
  assert.equal(row.verification_note, "দুই সূত্র");
  assert.ok(typeof row.verified_at === "string" && row.verified_at.length > 0);
});

await check("a claim cannot be empty", async () => {
  await assert.rejects(() => upsertClaim({ postId: "p1", claimBn: "   " }, client));
});

console.log(`[db] verification: ${passed} checks passed`);

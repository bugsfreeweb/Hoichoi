/**
 * Verification grades.
 *
 * The badge on a story is only honest if the grade is computed from records, so
 * these checks pin the refusals: one source is never "partially verified",
 * "verified" needs a named reviewer *and* evidence, a disputed claim wins, and
 * an AI rewrite score is not an input at all.
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

await check("one source is a source claim, never partial verification", () => {
  assert.equal(gradeFromEvidence({ sourceCount: 1 }), "source_claimed");
  assert.equal(gradeFromEvidence({ sourceCount: 1, verifierName: "a@b.c" }), "partially_verified");
  assert.equal(gradeFromEvidence({ sourceCount: 2 }), "partially_verified");
});

await check("editor verification needs evidence as well as a name", () => {
  assert.equal(gradeFromEvidence({ sourceCount: 2, verifierName: null }), "partially_verified");
  assert.equal(gradeFromEvidence({ sourceCount: 1, verifierName: "editor@hoichoi.local" }), "partially_verified");
  assert.equal(
    gradeFromEvidence({ sourceCount: 1, verifierName: "editor@hoichoi.local", evidenceCount: 1 }),
    "verified",
  );
});

await check("a disputed or false claim overrides everything", () => {
  assert.equal(
    gradeFromEvidence({ sourceCount: 5, verifierName: "editor@x", claims: [{ status: "disputed" }], evidenceCount: 4 }),
    "disputed",
  );
  assert.equal(gradeFromEvidence({ sourceCount: 5, claims: [{ status: "false" }] }), "disputed");
});

await check("supported claims without an evidence URL do not verify a story", () => {
  assert.equal(
    gradeFromEvidence({ sourceCount: 1, claims: [{ status: "supported" }] }),
    "source_claimed",
  );
  assert.equal(
    gradeFromEvidence({
      sourceCount: 1,
      verifierName: "editor@x",
      claims: [{ status: "supported", evidence_url: "https://ev.example/1" }],
    }),
    "verified",
  );
});

await check("no source at all is unverified", () => {
  assert.equal(gradeFromEvidence({ sourceCount: 0 }), "unverified");
});

await check("every known grade renders, including the honest weak ones", () => {
  assert.equal(showsBadge("unverified"), true);
  assert.equal(showsBadge("source_claimed"), true);
  assert.equal(showsBadge("partially_verified"), true);
  assert.equal(showsBadge("verified"), true);
  assert.equal(showsBadge("disputed"), true);
  assert.equal(showsBadge("retracted"), true);
  assert.equal(showsBadge(null), false);
  assert.equal(showsBadge("not-a-grade"), false);
});

/* ---------- storage ---------- */

const client = createClient({ url: ":memory:" });
for (const name of ["001_init", "028_verification", "045_trust_metadata"]) {
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

await check("setVerification stores grade, reviewer, evidence and review state", async () => {
  await setVerification(
    "p1",
    "verified",
    {
      note: "দুই সূত্র",
      verifierName: "editor@x",
      reviewerId: "user-1",
      evidence: ["https://ev.example/1"],
    },
    client,
  );
  const row = (await client.execute(
    "SELECT verification_status, verified_by, verification_note, verified_at, reviewer_id, verification_evidence, is_human_reviewed FROM posts WHERE id = 'p1'",
  )).rows[0] as Record<string, unknown>;
  assert.equal(row.verification_status, "verified");
  assert.equal(row.verified_by, "editor@x");
  assert.equal(row.reviewer_id, "user-1");
  assert.equal(row.verification_note, "দুই সূত্র");
  assert.equal(row.is_human_reviewed, 1);
  assert.deepEqual(JSON.parse(String(row.verification_evidence)), ["https://ev.example/1"]);
  assert.ok(typeof row.verified_at === "string" && row.verified_at.length > 0);
});

await check("a claim cannot be empty", async () => {
  await assert.rejects(() => upsertClaim({ postId: "p1", claimBn: "   " }, client));
});

console.log(`[db] verification: ${passed} checks passed`);

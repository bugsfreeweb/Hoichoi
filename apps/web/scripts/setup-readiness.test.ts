import assert from "node:assert/strict";
import {
  evaluateReadiness,
  isPreflightBlocked,
  isSuccessfulRun,
  missingFromPreflight,
  RUN_SUCCESS_STATUS,
} from "../src/lib/setup-readiness";

/**
 * The /admin/setup page reported "setup incomplete" no matter what, because it
 * tested for `status === "success"` while the pipeline writes `completed`.
 * These checks pin the real status values and the preflight parsing.
 */

// Verbatim from GitHub Actions run 36665165698.
const PREFLIGHT_ERROR =
  "Missing required repository secrets: TURSO_DATABASE_URL TURSO_AUTH_TOKEN FB_SESSION_COOKIE an LLM key: one of GOOGLE_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY, OLLAMA_BASE_URL";

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

await check("the real success status is 'completed', never 'success'", () => {
  assert.equal(RUN_SUCCESS_STATUS, "completed");
  assert.ok(isSuccessfulRun({ status: "completed", error: null, started_at: "2026-09-30T00:00:00Z" }));
  assert.ok(!isSuccessfulRun({ status: "success", error: null, started_at: "2026-09-30T00:00:00Z" }));
  assert.ok(!isSuccessfulRun({ status: "failed", error: "boom", started_at: "2026-09-30T00:00:00Z" }));
  assert.ok(!isSuccessfulRun({ status: "running", error: null, started_at: "2026-09-30T00:00:00Z" }));
});

await check("recognises a preflight failure and extracts the missing names", () => {
  assert.ok(isPreflightBlocked(PREFLIGHT_ERROR));
  const missing = missingFromPreflight(PREFLIGHT_ERROR);
  for (const name of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "FB_SESSION_COOKIE", "GOOGLE_API_KEY"]) {
    assert.ok(missing.includes(name), `${name} should be reported missing, got: ${missing.join(",")}`);
  }
});

await check("a preflight failure marks only the named secrets as outstanding", () => {
  const v = evaluateReadiness([{ status: "failed", error: PREFLIGHT_ERROR, started_at: "2026-09-30T00:00:00Z" }]);
  assert.equal(v.preflightBlocked, true);
  assert.ok(v.missing.includes("TURSO_DATABASE_URL"));
  // The one thing that IS set must not be reported missing.
  assert.ok(!v.missing.includes("VERCEL_DEPLOY_HOOK_URL"));
});

await check("a completed run makes setup ready", () => {
  const v = evaluateReadiness([
    { status: "completed", error: null, started_at: "2026-09-30T00:00:00Z" },
    { status: "failed", error: PREFLIGHT_ERROR, started_at: "2026-09-29T00:00:00Z" },
  ]);
  // An older preflight failure must not keep the page permanently red once a
  // later run proves the secrets are in place.
  assert.equal(v.preflightBlocked, false);
  assert.equal(v.noSuccessYet, false);
  assert.ok(v.present.includes("TURSO_DATABASE_URL"));
  assert.ok(v.present.includes("FB_SESSION_COOKIE"));
});

await check("with no runs at all nothing is claimed present", () => {
  const v = evaluateReadiness([]);
  assert.deepEqual(v.present, []);
  assert.equal(v.lastRun, null);
  assert.equal(v.noSuccessYet, true);
});

await check("a non-preflight failure does not invent missing secrets", () => {
  const v = evaluateReadiness([
    { status: "failed", error: "scrape: no sources configured", started_at: "2026-09-30T00:00:00Z" },
  ]);
  assert.equal(v.preflightBlocked, false);
  assert.equal(v.noSuccessYet, true);
  assert.deepEqual(v.present, []);
});

console.log(`\n[web] ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

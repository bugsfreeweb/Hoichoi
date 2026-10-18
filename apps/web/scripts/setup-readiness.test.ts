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

// Verbatim from GitHub Actions run 36665165698, before FB_SESSION_COOKIE was
// demoted from a hard gate to a warning.
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

/**
 * The whole point of demoting FB_SESSION_COOKIE: a missing Facebook login must
 * never read as "setup is blocked", or the banner nags about work that is
 * already fine and the operator chases a non-problem.
 */
await check("a missing Facebook cookie is advisory, never blocking", () => {
  const v = evaluateReadiness([{ status: "failed", error: PREFLIGHT_ERROR, started_at: "2026-09-30T00:00:00Z" }]);
  assert.ok(
    v.advisory.includes("FB_SESSION_COOKIE"),
    `FB_SESSION_COOKIE should be advisory, got: ${JSON.stringify(v.advisory)}`,
  );
  assert.ok(
    !v.missing.includes("FB_SESSION_COOKIE"),
    "FB_SESSION_COOKIE must not appear in the blocking missing list",
  );
  // The two real gates are still reported as blocking.
  assert.ok(v.missing.includes("TURSO_DATABASE_URL"));
  assert.ok(v.missing.includes("TURSO_AUTH_TOKEN"));
});

/** With nothing configured at all, the cookie is still only advisory. */
await check("a cold start only blocks on Turso and the LLM key", () => {
  const v = evaluateReadiness([]);
  assert.ok(v.missing.includes("TURSO_DATABASE_URL"));
  assert.ok(v.missing.includes("TURSO_AUTH_TOKEN"));
  assert.ok(!v.missing.includes("FB_SESSION_COOKIE"));
  assert.ok(v.advisory.includes("FB_SESSION_COOKIE"));
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

/**
 * The regression that made a fully configured install read as unconfigured: the
 * last 20 runs were all failures (and stale `running` rows left by killed
 * workers) during an outage, while 59 earlier runs had completed.
 */
await check("a historical success keeps setup ready even when the window is all failures", () => {
  const window = Array.from({ length: 20 }, (_, i) => ({
    status: "failed",
    error: "all providers exhausted",
    started_at: `2026-10-1${i % 10}T00:00:00Z`,
  }));
  const without = evaluateReadiness(window);
  assert.deepEqual(without.present, [], "without the historical hint the window alone proves nothing");

  const v = evaluateReadiness(window, { hasCompletedEver: true });
  assert.equal(v.noSuccessYet, false);
  assert.equal(v.preflightBlocked, false);
  assert.ok(v.present.includes("TURSO_DATABASE_URL"));
  assert.ok(v.present.includes("FB_SESSION_COOKIE"));
});

await check("a run that is still running proves preflight passed", () => {
  const v = evaluateReadiness([
    { status: "running", error: null, started_at: "2026-10-15T23:24:46Z" },
    { status: "failed", error: "all providers exhausted", started_at: "2026-10-15T04:32:51Z" },
  ]);
  assert.equal(v.noSuccessYet, false);
  assert.ok(v.present.includes("TURSO_DATABASE_URL"));
});

await check("a current preflight failure still overrides an older success", () => {
  const v = evaluateReadiness(
    [{ status: "failed", error: PREFLIGHT_ERROR, started_at: "2026-10-16T00:00:00Z" }],
    { hasCompletedEver: true },
  );
  assert.equal(v.preflightBlocked, true);
  assert.ok(v.missing.includes("TURSO_DATABASE_URL"));
});

console.log(`\n[web] ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

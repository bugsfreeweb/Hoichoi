import assert from "node:assert/strict";
import { evaluateSecrets, LLM_SECRET_NAMES, SECRET_SPECS } from "../secrets";

/**
 * The setup guide tells an operator whether automation can run. Getting that
 * wrong in either direction is costly: a false "ready" wastes a debugging
 * session, and a false "blocked" makes a working setup look broken. These
 * tests pin the rules the banner depends on.
 */

const byName = (n: string) => SECRET_SPECS.find((s) => s.name === n)!;

// The exact set the workflow's preflight refuses to start without.
const WORKFLOW_REQUIRED = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"];

for (const name of WORKFLOW_REQUIRED) {
  const spec = byName(name);
  assert.equal(spec.requirement, "required", `${name} must be marked required`);
}

/**
 * FB_SESSION_COOKIE used to be a hard gate, which meant a missing or expired
 * Facebook login silently took the whole pipeline — and therefore the public
 * site's content — down with it. The workflow now only warns, and the scraper
 * already treats the cookie as optional, so the spec must agree.
 */
assert.equal(
  byName("FB_SESSION_COOKIE").requirement,
  "recommended",
  "FB_SESSION_COOKIE only warns in pipeline-cron.yml, so it must not be a hard requirement",
);

/** VERCEL_DEPLOY_HOOK_URL is only a warning in the workflow, never a blocker. */
assert.equal(
  byName("VERCEL_DEPLOY_HOOK_URL").requirement,
  "recommended",
  "deploy hook is a warning in pipeline-cron.yml, not a hard requirement",
);
/**
 * The set of hard requirements is exactly the preflight list plus the LLM key.
 * A secret marked `required` that the workflow does not actually gate would
 * block the readiness banner on something that does not matter — which is the
 * bug that made VERCEL_DEPLOY_HOOK_URL look mandatory.
 */
assert.deepEqual(
  SECRET_SPECS.filter((s) => s.requirement === "required")
    .map((s) => s.name)
    .sort(),
  ["LLM_PROVIDER_KEY", "TURSO_AUTH_TOKEN", "TURSO_DATABASE_URL"].sort(),
  "exactly the gated secrets are marked required",
);

// Nothing empty, nothing missing a field an operator needs.
for (const spec of SECRET_SPECS) {
  assert.ok(spec.name, "secret has a name");
  assert.ok(spec.labelBn.length > 0, `${spec.name} has a Bangla label`);
  assert.ok(spec.purposeBn.length > 20, `${spec.name} explains its purpose`);
  assert.ok(spec.howToBn.length >= 2, `${spec.name} has actionable steps`);
  assert.ok(spec.ifMissingBn.length > 10, `${spec.name} states the failure mode`);
  assert.ok(spec.dashboardUrl?.startsWith("https://"), `${spec.name} links to its dashboard`);
  if (spec.name !== "LLM_PROVIDER_KEY") {
    // The generic LLM entry is a menu of alternatives, so its example lists
    // several real names instead of its own placeholder.
    assert.ok(
      spec.envExample.includes(spec.name),
      `${spec.name} has an .env example naming itself`,
    );
  } else {
    assert.ok(
      LLM_SECRET_NAMES.some((k) => spec.envExample.includes(k)),
      "the LLM example names at least one concrete provider key",
    );
  }
}

/** Duplicate names would silently collapse two requirements into one. */
const names = SECRET_SPECS.map((s) => s.name);
assert.equal(new Set(names).size, names.length, "secret names are unique");

/** An empty repo is blocked on every required secret. */
const empty = evaluateSecrets([], []);
assert.equal(
  empty.filter((r) => r.spec.requirement === "required" && !r.satisfied).length,
  3,
  "three required secrets are unsatisfied with nothing configured (Turso pair + LLM)",
);
// Optional and recommended items are never blocking.
for (const r of empty.filter((x) => x.spec.requirement !== "required")) {
  assert.equal(r.satisfied, true, `${r.spec.name} must not block the pipeline`);
}

/** Turso alone is still blocked: without an LLM key nothing rewrites. */
const noLlm = evaluateSecrets([...WORKFLOW_REQUIRED], []);
const noLlmState = noLlm.find((r) => r.spec.name === "LLM_PROVIDER_KEY")!;
assert.equal(noLlmState.satisfied, false, "no LLM key means the pipeline cannot rewrite");

/** Any single LLM variant satisfies the requirement. */
for (const key of LLM_SECRET_NAMES) {
  const state = evaluateSecrets([...WORKFLOW_REQUIRED, key], []).find(
    (r) => r.spec.name === "LLM_PROVIDER_KEY",
  )!;
  assert.equal(state.satisfied, true, `${key} should satisfy the LLM requirement`);
  assert.equal(state.present, true, `${key} should register as present`);
}

/** A non-LLM secret must not accidentally satisfy the LLM requirement. */
const wrongKey = evaluateSecrets([...WORKFLOW_REQUIRED, "TURSO_TOKEN_TYPO"], []).find(
  (r) => r.spec.name === "LLM_PROVIDER_KEY",
)!;
assert.equal(wrongKey.satisfied, false, "an unrelated secret must not satisfy the LLM slot");

/** A fully configured pipeline is unblocked. */
const complete = evaluateSecrets(
  [...WORKFLOW_REQUIRED, "GOOGLE_API_KEY", "VERCEL_DEPLOY_HOOK_URL"],
  [],
);
assert.ok(
  complete.filter((r) => r.spec.requirement === "required").every((r) => r.satisfied),
  "a complete configuration has no blocking gaps",
);

/** Vault contents are reported but never gate readiness on their own. */
const vaultOnly = evaluateSecrets([], ["turso_url", "turso_token", "fb_session_cookie", "GOOGLE_API_KEY"]);
assert.ok(
  vaultOnly.filter((r) => r.spec.requirement === "required").every((r) => !r.satisfied),
  "vault values alone do not prove the secrets reached GitHub",
);
assert.ok(
  vaultOnly.some((r) => r.inVault),
  "vault membership is still reported for the desk UI",
);

console.log("[test] secret catalog checks passed");

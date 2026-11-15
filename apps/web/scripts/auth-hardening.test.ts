import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Auth hardening guards.
 *
 * Two live defects are pinned here because both are "a guard line is missing"
 * bugs: `tsc` cannot see them, they have no visible symptom in the UI, and each
 * one hands an unauthenticated stranger a production power.
 *
 * 1. `POST /api/auth/login` used to insert an `admin_users` row with
 *    `role = 'admin'` for *any* email whose one-time code validated. The only
 *    brake was `ADMIN_ALLOWED_EMAILS`, checked later in `currentUser()` — and
 *    skipped entirely when the variable was unset. One leaked code therefore
 *    became a superuser account. Account creation must be gated on the invite
 *    list at *creation* time, and the eligibility check must happen before the
 *    code is consumed.
 *
 * 2. `GET /api/revalidate` was guarded by
 *    `if (expectedSecret && secret !== expectedSecret)`, i.e. it failed *open*:
 *    with `REVALIDATE_SECRET` unset (the state of this repo's env) any anonymous
 *    request could flush the whole site cache.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, "..", "src", "app", rel), "utf8");

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const login = read("api/auth/login/route.ts");
const revalidate = read("api/revalidate/route.ts");

/** Code only — a comment that *describes* the old guard must not satisfy (or
 *  break) an assertion about the guard, which is exactly how the theme audit
 *  once failed on its own documentation. */
const stripComments = (src: string) =>
  src
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*") &&
        !line.trim().startsWith("/*"),
    )
    .join("\n");

check("login: account creation is gated on the invite list", () => {
  assert.match(login, /ADMIN_ALLOWED_EMAILS/, "login must read ADMIN_ALLOWED_EMAILS");
  assert.match(
    login,
    /!existing\s*&&\s*!invited/,
    "login must refuse an email that is neither provisioned nor invited",
  );
  // The refusal must not reveal whether the address is an admin.
  const refusal = login.slice(login.indexOf("!existing && !invited"));
  assert.match(refusal, /GENERIC_ERROR/, "the uninvited refusal must use the generic error");
});

check("login: eligibility is checked before the code is consumed", () => {
  const inviteCheck = login.indexOf("!existing && !invited");
  const consume = login.indexOf("await consumeAdminLoginCode");
  assert.ok(inviteCheck > -1 && consume > -1, "both steps must exist");
  assert.ok(
    inviteCheck < consume,
    "the invite check must run BEFORE consumeAdminLoginCode so a wrong attempt cannot burn a real code",
  );
});

check("login: no implicit superuser — only the bootstrap account is role admin", () => {
  assert.match(login, /bootstrap\s*\?\s*"admin"\s*:\s*"editor"/, "new invited accounts must start as editor");
  assert.ok(
    !/INSERT OR IGNORE INTO admin_users[\s\S]{0,400}?'admin',\s*\n?\s*new Date/.test(login),
    "the insert must not hardcode the admin role",
  );
});

check("revalidate: fails closed when the secret is not configured", () => {
  assert.match(revalidate, /configuredSecret/, "revalidate must read the secret through one helper");
  assert.match(revalidate, /status:\s*503/, "an unconfigured secret must return 503");
  const revalidateCode = stripComments(revalidate);
  assert.ok(
    !/if\s*\(\s*expectedSecret\s*&&/.test(revalidateCode),
    "the old `expected && mismatch` fail-open guard must be gone",
  );
  assert.match(revalidate, /timingSafeEqual/, "the secret comparison must be constant-time");
});

const auth = readFileSync(join(here, "..", "src", "lib", "auth.ts"), "utf8");
const authCode = stripComments(auth);

check("auth: session lifetime comes from the policy module, not a 365-day literal", () => {
  assert.match(authCode, /session-policy/, "auth.ts must import the session policy");
  assert.match(authCode, /sessionState\(/, "auth.ts must classify sessions with sessionState()");
  assert.match(authCode, /nextExpiry\(/, "auth.ts must compute expiry with nextExpiry()");
  assert.match(
    authCode,
    /SESSION_MAX_AGE_MS = 30 \* 24/,
    "the cookie lifetime constant must be 30 days (the device-id cookie keeps its own, longer life)",
  );
  assert.match(
    authCode,
    /maxAge: SESSION_MAX_AGE_MS \/ 1000/,
    "the session cookie must use the 30-day constant",
  );
});

check("auth: logout revokes the row instead of deleting it", () => {
  assert.match(
    authCode,
    /UPDATE admin_sessions SET revoked_at/,
    "logout must stamp revoked_at so a stolen copy of the cookie stops working and the history survives",
  );
  assert.ok(
    !/DELETE FROM admin_sessions WHERE token_hash = \?[\s\S]{0,40}store\.delete/.test(authCode),
    "logout must not fall back to a silent DELETE",
  );
});

check("auth: ip and user agent are hashed before storage", () => {
  assert.match(authCode, /hashValue\(/, "device metadata must go through hashValue()");
  assert.ok(!/args: \[[^\]]*ip[^\]]*\]/.test(authCode), "raw ip must not be bound as a session argument");
});

console.log(`[web] auth-hardening: ${passed} checks passed`);

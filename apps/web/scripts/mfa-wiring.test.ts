/**
 * The second factor is only worth anything if the door actually checks it.
 *
 * These are wiring checks, not behaviour checks (the behaviour lives in
 * packages/db/src/__tests__/mfa.test.ts): the login route must call
 * `verifyMfaLogin` *after* the code is consumed and *before* a session is
 * created, the management route must be role-guarded and must never hand back a
 * secret or recovery codes from a read, and a lockout must be consulted before
 * the one-time code is spent.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), "utf8");

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const login = read("src/app/api/auth/login/route.ts");
const mfaRoute = read("src/app/api/admin/mfa/route.ts");

check("login consults the lockout before consuming the code", () => {
  // Search the handler body only: the names also appear in the import list.
  const body = login.slice(login.indexOf("export async function POST"));
  const lockAt = body.indexOf("loginLockState(");
  const consumeAt = body.indexOf("consumeAdminLoginCode(");
  assert.ok(lockAt !== -1, "loginLockState must be called");
  assert.ok(consumeAt !== -1);
  assert.ok(lockAt < consumeAt, "the lock must be checked before spending a code");
});

check("login verifies the second factor before creating a session", () => {
  const mfaAt = login.indexOf("verifyMfaLogin");
  const sessionAt = login.indexOf("createSession");
  assert.ok(mfaAt !== -1, "verifyMfaLogin must be called");
  assert.ok(sessionAt !== -1);
  assert.ok(mfaAt < sessionAt, "no session may exist before the factor is checked");
});

check("a failed factor does not grant a session and says why", () => {
  assert.match(login, /mfaRequired: true/);
  assert.match(login, /two-digit|দুই-ধাপ/);
});

check("successful and failed attempts are both recorded", () => {
  const records = login.match(/recordLoginAttempt\(/g) ?? [];
  assert.ok(records.length >= 3, `expected attempt recording on lock, failure and success, saw ${records.length}`);
  assert.match(login, /outcome: "ok"/);
});

check("the management route is role-guarded", () => {
  const guards = mfaRoute.match(/requireApiRole\("/g) ?? [];
  assert.equal(guards.length, 2, "both GET and POST must declare a minimum role");
});

check("the management route acts only on the caller's own account", () => {
  assert.equal(
    /body\.email|body\?\.email/.test(mfaRoute),
    false,
    "there must be no email parameter — a route that can enroll someone else is a takeover tool",
  );
  assert.ok(mfaRoute.includes("guard.user.email"));
});

check("a read never returns the secret or the recovery codes", () => {
  const get = mfaRoute.slice(mfaRoute.indexOf("export async function GET"), mfaRoute.indexOf("export async function POST"));
  assert.equal(/secret|recoveryCodes:/.test(get.replace(/recoveryCodesRemaining/g, "")), false);
});

check("enroll, enable and disable are all audited", () => {
  for (const action of ["mfa.begin", "mfa.enable", "mfa.disable"]) {
    assert.ok(mfaRoute.includes(`action: "${action}"`), `missing audit action ${action}`);
  }
});

check("the console surfaces the panel on the security page", () => {
  const page = read("src/app/admin/(console)/security/page.tsx");
  assert.ok(page.includes("MfaPanel"), "security page must render the panel");
});

check("desktop trust is not implied — no secret is written to localStorage or a cookie", () => {
  const panel = read("src/components/admin/MfaPanel.tsx");
  assert.equal(/localStorage|document\.cookie/.test(panel), false);
});

console.log(`\n${passed} MFA wiring checks passed.`);
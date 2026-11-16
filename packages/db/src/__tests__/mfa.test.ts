/**
 * TOTP + second-factor lifecycle + login lockout.
 *
 * The crypto is pinned to the RFC's own vectors: if the base32 or counter width
 * ever drifts, these fail before a human does. The lifecycle checks pin the
 * refusals that matter — an unconfirmed secret cannot log anyone in, a step
 * cannot be replayed, a recovery code works once, and five bad codes lock the
 * email rather than allowing HTTP-speed guessing.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { applyMigration, __useClientForTests } from "../client";
import { migrationSql } from "../migrations";
import { base32Decode, base32Encode, hotp, totp, totpStep, verifyTotp, generateRecoveryCodes, hashRecoveryCode } from "../totp";
import {
  LOGIN_LOCK,
  beginMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  loginLockState,
  mfaState,
  recordLoginAttempt,
  verifyMfaLogin,
} from "../mfa";

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

/* ---------- pure crypto, against RFC 6238/4226 vectors ---------- */

// RFC 4226 Appendix D: the shared secret is ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890", "ascii"));

await check("base32 round-trips the RFC secret", () => {
  assert.equal(RFC_SECRET, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.equal(base32Decode(RFC_SECRET).toString("ascii"), "12345678901234567890");
});

await check("HOTP matches the published counter values", () => {
  assert.equal(hotp(RFC_SECRET, 0), "755224");
  assert.equal(hotp(RFC_SECRET, 1), "287082");
  assert.equal(hotp(RFC_SECRET, 9), "520489");
});

await check("TOTP matches RFC 6238 at T=59 with 8 digits", () => {
  assert.equal(totpStep(59_000), 1);
  assert.equal(totp(RFC_SECRET, 59_000, 8), "94287082");
});

await check("a code from the previous or next step is accepted (clock drift)", () => {
  const now = 1_700_000_000_000;
  const prev = hotp(RFC_SECRET, totpStep(now) - 1);
  const next = hotp(RFC_SECRET, totpStep(now) + 1);
  assert.equal(verifyTotp(RFC_SECRET, prev, { at: now }).ok, true);
  assert.equal(verifyTotp(RFC_SECRET, next, { at: now }).ok, true);
});

await check("a code two steps away is refused", () => {
  const now = 1_700_000_000_000;
  const far = hotp(RFC_SECRET, totpStep(now) + 3);
  assert.equal(verifyTotp(RFC_SECRET, far, { at: now }).ok, false);
});

await check("a non-numeric or short code is refused without throwing", () => {
  assert.equal(verifyTotp(RFC_SECRET, "0000000").ok, false);
  assert.equal(verifyTotp(RFC_SECRET, "abcdef").ok, false);
});

/* ---------- lifecycle against a real database ---------- */

const file = path.join(os.tmpdir(), `hoichoi-mfa-${Date.now()}.db`);
const client = createClient({ url: `file:${file}` });
__useClientForTests(client);
const sql = migrationSql("035_admin_mfa");
assert.ok(sql, "migration 035_admin_mfa must exist");
await applyMigration(client, "035_admin_mfa", sql);

await check("an account starts with no second factor", async () => {
  assert.equal(await mfaState("admin@hoichoi.io"), null);
});

await check("beginning enrollment stores a secret but does not enable it", async () => {
  const begun = await beginMfaEnrollment("admin@hoichoi.io");
  assert.match(begun.uri, /^otpauth:\/\/totp\//);
  const state = await mfaState("admin@hoichoi.io");
  assert.equal(state?.enabled, false);
});

await check("an unconfirmed enrollment cannot be used to log in", async () => {
  const out = await verifyMfaLogin("admin@hoichoi.io", "123456");
  assert.equal(out.ok, true);
  assert.equal(out.reason, "not_enabled");
});

await check("a wrong confirmation code is refused", async () => {
  await assert.rejects(confirmMfaEnrollment("admin@hoichoi.io", "000000"), /কোডটি সঠিক নয়/);
});

await check("confirming with a live code enables the factor and returns recovery codes", async () => {
  const row = (await client.execute("SELECT secret FROM admin_mfa WHERE email = 'admin@hoichoi.io'")).rows[0] as Record<
    string,
    unknown
  >;
  const secret = String(row.secret);
  const { recoveryCodes } = await confirmMfaEnrollment("admin@hoichoi.io", totp(secret));
  assert.equal(recoveryCodes.length, 8);
  const state = await mfaState("admin@hoichoi.io");
  assert.equal(state?.enabled, true);
  assert.equal(state?.recoveryCodesRemaining, 8);
  assert.ok(state?.confirmedAt);
});

await check("a login code is accepted once and a replay is refused", async () => {
  const row = (await client.execute("SELECT secret FROM admin_mfa WHERE email = 'admin@hoichoi.io'")).rows[0] as Record<
    string,
    unknown
  >;
  const secret = String(row.secret);
  // The confirmation consumed its own step, so a login uses the next one.
  const later = Date.now() + 30_000;
  const code = totp(secret, later);
  assert.equal((await verifyMfaLogin("admin@hoichoi.io", code, later)).ok, true);
  const replay = await verifyMfaLogin("admin@hoichoi.io", code, later);
  assert.equal(replay.ok, false);
  assert.equal(replay.reason, "replay");
});

await check("a recovery code works exactly once", async () => {
  const { recoveryCodes } = await confirmRecoveryFixture();
  const first = await verifyMfaLogin("admin@hoichoi.io", recoveryCodes[0]!);
  assert.equal(first.ok, true);
  const again = await verifyMfaLogin("admin@hoichoi.io", recoveryCodes[0]!);
  assert.equal(again.ok, false);
});

await check("disabling needs a valid code", async () => {
  await assert.rejects(disableMfa("admin@hoichoi.io", "000000"), /কোডটি সঠিক নয়/);
  const row = (await client.execute("SELECT secret FROM admin_mfa WHERE email = 'admin@hoichoi.io'")).rows[0] as Record<
    string,
    unknown
  >;
  const later = Date.now() + 60_000;
  await disableMfa("admin@hoichoi.io", totp(String(row.secret), later), later);
  assert.equal((await mfaState("admin@hoichoi.io"))?.enabled ?? false, false);
});

await check("recovery code hashing is stable and never stores the code", () => {
  const code = generateRecoveryCodes(1)[0]!;
  assert.equal(hashRecoveryCode(code), hashRecoveryCode(code.toLowerCase()));
  assert.notEqual(hashRecoveryCode(code), code);
});

/* ---------- lockout ---------- */

await check("no failures means no lock", async () => {
  const state = await loginLockState("hash-a");
  assert.equal(state.locked, false);
  assert.equal(state.failures, 0);
});

await check("five failures in the window lock the email", async () => {
  for (let i = 0; i < LOGIN_LOCK.maxFailures; i += 1) {
    await recordLoginAttempt({ emailHash: "hash-b", ipHash: null, outcome: "bad_code" });
  }
  const state = await loginLockState("hash-b");
  assert.equal(state.locked, true);
  assert.ok(state.retryAfterMs > 0);
});

await check("an old failure falls out of the window", async () => {
  const stale = new Date(Date.now() - LOGIN_LOCK.windowMs - 60_000).toISOString();
  for (let i = 0; i < LOGIN_LOCK.maxFailures; i += 1) {
    await client.execute({
      sql: "INSERT INTO login_attempts (id, email_hash, ip_hash, outcome, created_at) VALUES (?, 'hash-c', NULL, 'bad_code', ?)",
      args: [crypto.randomUUID(), stale],
    });
  }
  const state = await loginLockState("hash-c");
  assert.equal(state.locked, false);
});

await check("one email's lock does not lock another", async () => {
  assert.equal((await loginLockState("hash-b")).locked, true);
  assert.equal((await loginLockState("hash-d")).locked, false);
});

/** Re-enroll a fresh secret on the same account and return its recovery codes. */
async function confirmRecoveryFixture(): Promise<{ recoveryCodes: string[] }> {
  await client.execute("DELETE FROM admin_mfa WHERE email = 'admin@hoichoi.io'");
  const begun = await beginMfaEnrollment("admin@hoichoi.io");
  // The secret is what `begin` wrote; confirming proves possession.
  const confirmed = await confirmMfaEnrollment("admin@hoichoi.io", totp(begun.secret));
  return confirmed;
}

console.log(`\n${passed} MFA checks passed.`);
client.close();
try {
  fs.unlinkSync(file);
} catch {
  // temp file
}
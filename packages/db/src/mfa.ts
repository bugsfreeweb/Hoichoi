import crypto from "node:crypto";
import { getClient } from "./client";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  totpUri,
  verifyTotp,
} from "./totp";

/**
 * Second factor state for privileged accounts.
 *
 * Lifecycle:
 *   1. `beginMfaEnrollment(email)` — stores a fresh secret with `enabled = 0`;
 *      the caller shows the otpauth URI once.
 *   2. `confirmMfaEnrollment(email, code)` — verifies a live code (proves the
 *      person actually has the app), then enables and issues recovery codes.
 *      Reconfirming is refused; the URI is not granted to the API again.
 *   3. `verifyMfaLogin(email, code | recovery)` — the login-time check with
 *      replay protection (a used TOTP step is refused).
 *   4. `disableMfa(email, code)` — an enabled account needs a valid code to
 *      disable, so a stolen session cannot silently drop the factor.
 *
 * The secret is HMAC-bound to nothing extra: the row's secret is the only
 * credential. It is never returned by any reader after enrollment.
 */

export interface MfaState {
  email: string;
  enabled: boolean;
  confirmedAt: string | null;
  hasRecoveryCodes: boolean;
  recoveryCodesRemaining: number;
  lastUsedStep: number | null;
}

export async function mfaState(email: string): Promise<MfaState | null> {
  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM admin_mfa WHERE email = ?", args: [email] });
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  let remaining = 0;
  if (row.recovery_codes_json) {
    try {
      remaining = (JSON.parse(String(row.recovery_codes_json)) as string[]).length;
    } catch {
      remaining = 0;
    }
  }
  return {
    email: String(row.email),
    enabled: Number(row.enabled ?? 0) === 1,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    hasRecoveryCodes: Boolean(row.recovery_codes_json),
    recoveryCodesRemaining: remaining,
    lastUsedStep: row.last_used_step ? Number(row.last_used_step) : null,
  };
}

const BCRYPTISH_ISSUER = "Hoichoi Desk";

/** Start enrollment: a row with a fresh secret, still disabled. Idempotent. */
export async function beginMfaEnrollment(email: string): Promise<{ secret: string; uri: string }> {
  const client = getClient();
  const existing = await mfaState(email);
  if (existing?.enabled) throw new Error("MFA ইতিমধ্যে চালু আছে।");
  const secret = generateTotpSecret();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO admin_mfa (email, secret, enabled, created_at, updated_at) VALUES (?, ?, 0, ?, ?)
          ON CONFLICT(email) DO UPDATE SET secret = excluded.secret, enabled = 0, updated_at = excluded.updated_at`,
    args: [email, secret, now, now],
  });
  return { secret, uri: totpUri({ secret, account: email, issuer: BCRYPTISH_ISSUER }) };
}

export async function confirmMfaEnrollment(email: string, code: string): Promise<{ recoveryCodes: string[] }> {
  const client = getClient();
  const row = await client.execute({ sql: "SELECT secret, enabled FROM admin_mfa WHERE email = ?", args: [email] });
  if (row.rows.length === 0) throw new Error("আগে MFA এনরোলমেন্ট শুরু করুন।");
  const rec = row.rows[0] as Record<string, unknown>;
  if (Number(rec.enabled ?? 0) === 1) throw new Error("MFA ইতিমধ্যে নিশ্চিত হয়েছে।");

  const checked = verifyTotp(String(rec.secret), code);
  if (!checked.ok || checked.step === undefined) throw new Error("কোডটি সঠিক নয় — আবার চেষ্টা করুন।");

  const recoveryCodes = generateRecoveryCodes(8);
  const now = new Date().toISOString();
  await client.execute({
    sql: `UPDATE admin_mfa SET enabled = 1, confirmed_at = ?, recovery_codes_json = ?, last_used_step = ?, updated_at = ?
          WHERE email = ?`,
    args: [now, JSON.stringify(recoveryCodes.map(hashRecoveryCode)), checked.step, now, email],
  });
  return { recoveryCodes };
}

/** Login-time second factor: a TOTP code or a recovery code, with replay guard. */
export async function verifyMfaLogin(
  email: string,
  code: string,
  /** Test seam: the clock. Production always passes Date.now(). */
  at: number = Date.now(),
): Promise<{ ok: boolean; reason?: "not_enabled" | "bad_code" | "replay" }> {
  const state = await mfaState(email);
  if (!state?.enabled) return { ok: true, reason: "not_enabled" };
  const client = getClient();

  const clean = code.trim().toUpperCase();
  if (clean.includes("-")) {
    // Recovery code path: single use, stored hashed.
    const row = await client.execute({
      sql: "SELECT recovery_codes_json FROM admin_mfa WHERE email = ?",
      args: [email],
    });
    const rec = row.rows[0] as Record<string, unknown> | undefined;
    if (!rec?.recovery_codes_json) return { ok: false, reason: "bad_code" };
    const codes = JSON.parse(String(rec.recovery_codes_json)) as string[];
    const wanted = hashRecoveryCode(clean);
    const idx = codes.indexOf(wanted);
    if (idx === -1) return { ok: false, reason: "bad_code" };
    codes.splice(idx, 1);
    await client.execute({
      sql: "UPDATE admin_mfa SET recovery_codes_json = ?, updated_at = ? WHERE email = ?",
      args: [JSON.stringify(codes), new Date().toISOString(), email],
    });
    return { ok: true };
  }

  const row = await client.execute({ sql: "SELECT secret, last_used_step FROM admin_mfa WHERE email = ?", args: [email] });
  const rec = row.rows[0] as Record<string, unknown>;
  const checked = verifyTotp(String(rec.secret), clean, { at });
  if (!checked.ok || checked.step === undefined) return { ok: false, reason: "bad_code" };
  const lastUsed = rec.last_used_step ? Number(rec.last_used_step) : null;
  if (lastUsed !== null && checked.step <= lastUsed) return { ok: false, reason: "replay" };
  await client.execute({
    sql: "UPDATE admin_mfa SET last_used_step = ?, updated_at = ? WHERE email = ?",
    args: [checked.step, new Date().toISOString(), email],
  });
  return { ok: true };
}

/** Disabling needs proof: a current code or a recovery code. */
export async function disableMfa(email: string, code: string, at: number = Date.now()): Promise<void> {
  const checked = await verifyMfaLogin(email, code, at);
  if (checked.reason === "not_enabled") throw new Error("এই অ্যাকাউন্টে MFA চালু নেই।");
  if (!checked.ok) throw new Error("কোডটি সঠিক নয় — আবার চেষ্টা করুন।");
  const client = getClient();
  await client.execute({ sql: "DELETE FROM admin_mfa WHERE email = ?", args: [email] });
}

/* ------------------------------------------------------------------ *
 * Login lockout — failed attempts counted per email hash
 * ------------------------------------------------------------------ */

export const LOGIN_LOCK = {
  maxFailures: 5,
  windowMs: 15 * 60_000,
  lockMs: 15 * 60_000,
};

export async function recordLoginAttempt(input: {
  emailHash: string;
  ipHash: string | null;
  outcome: "ok" | "bad_code" | "locked";
}): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "INSERT INTO login_attempts (id, email_hash, ip_hash, outcome, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [crypto.randomUUID(), input.emailHash, input.ipHash, input.outcome, new Date().toISOString()],
  });
}

/** How many failures for this email hash within the window, and whether it is locked. */
export async function loginLockState(emailHash: string, at: number = Date.now()): Promise<{
  failures: number;
  locked: boolean;
  retryAfterMs: number;
}> {
  const client = getClient();
  const since = new Date(at - LOGIN_LOCK.windowMs).toISOString();
  const res = await client.execute({
    sql: "SELECT created_at FROM login_attempts WHERE email_hash = ? AND outcome IN ('bad_code','locked') AND created_at >= ? ORDER BY created_at DESC",
    args: [emailHash, since],
  });
  const windowed = res.rows.length;
  if (windowed < LOGIN_LOCK.maxFailures) {
    return { failures: windowed, locked: false, retryAfterMs: 0 };
  }
  // Locked: the earliest of the window that pushed us over still has time left.
  const oldest = res.rows[res.rows.length - 1] as Record<string, unknown> | undefined;
  const oldestAt = oldest ? Date.parse(String(oldest.created_at)) : at;
  const retryAfterMs = Math.max(1000, oldestAt + LOGIN_LOCK.lockMs - at);
  return { failures: windowed, locked: true, retryAfterMs };
}
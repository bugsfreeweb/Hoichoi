import "server-only";

import { getClient } from "@hoichoi/db";
import { getUserByEmail } from "./auth";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { messageShell, sendMail, siteBaseUrl, type SendMailResult } from "./mail";

/**
 * Password recovery for both account kinds.
 *
 * The public API never reveals whether an address exists: the same response is
 * returned either way. When the account does exist the caller still gets the
 * delivery result, but only authenticated admin routes surface it.
 *
 * Tokens are single-use, hashed at rest and expire in an hour. Issuing a new
 * token invalidates the older unused ones for that principal, so a forwarded
 * link from a previous request cannot be replayed.
 */

export type ResetKind = "admin" | "advertiser";

const TTL_MS = 60 * 60 * 1000;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

async function principalFor(kind: ResetKind, email: string): Promise<{ id: string; email: string } | null> {
  const client = getClient();
  if (kind === "admin") {
    const user = await getUserByEmail(email);
    return user ? { id: user.user_id, email: user.email } : null;
  }
  const res = await client.execute({
    sql: "SELECT id, email FROM ad_clients WHERE email = ? LIMIT 1",
    args: [email.trim().toLowerCase()],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  return row ? { id: String(row.id), email: String(row.email) } : null;
}

export interface ResetRequestResult {
  /** False when the address is unknown — callers must not expose this publicly. */
  found: boolean;
  sent: boolean;
  transport?: SendMailResult["transport"];
  error?: string;
  /** Only populated for authenticated admin requests (never sent to a visitor). */
  devLink?: string;
}

/**
 * Create a reset token and email the link.
 *
 * `exposeLink` is for the admin console only: a fresh install with no mail
 * transport would otherwise be unable to recover an admin account at all.
 */
export async function requestPasswordReset(
  kind: ResetKind,
  emailRaw: string,
  opts: { exposeLink?: boolean } = {},
): Promise<ResetRequestResult> {
  const email = emailRaw.trim().toLowerCase();
  const principal = await principalFor(kind, email);
  if (!principal) return { found: false, sent: false };

  const client = getClient();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  await client.execute({
    sql: "UPDATE password_resets SET used_at = ? WHERE kind = ? AND principal = ? AND used_at IS NULL",
    args: [now.toISOString(), kind, principal.id],
  });
  await client.execute({
    sql: `INSERT INTO password_resets (id, kind, principal, email, token_hash, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      kind,
      principal.id,
      principal.email,
      hash(token),
      new Date(now.getTime() + TTL_MS).toISOString(),
      now.toISOString(),
    ],
  });

  const link = `${siteBaseUrl()}/${kind === "admin" ? "admin" : "portal"}/reset?token=${token}`;
  const heading = kind === "admin" ? "অ্যাডমিন পাসওয়ার্ড রিসেট" : "বিজ্ঞাপনদাতা পাসওয়ার্ড রিসেট";
  const body =
    kind === "admin"
      ? "আপনার হৈচৈ অ্যাডমিন অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার অনুরোধ পাওয়া গেছে।"
      : "আপনার হৈচৈ বিজ্ঞাপনদাতা অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার অনুরোধ পাওয়া গেছে।";
  const { text, html } = messageShell(heading, body, link, "নতুন পাসওয়ার্ড সেট করুন");
  const result = await sendMail({ to: principal.email, subject: heading, text, html });

  return {
    found: true,
    sent: result.ok,
    transport: result.transport,
    error: result.error,
    devLink: opts.exposeLink && !result.ok ? link : undefined,
  };
}

export interface ResetConsumeResult {
  ok: boolean;
  error?: string;
  kind?: ResetKind;
  email?: string;
  principal?: string;
}

/** Validate a token without consuming it, so the reset page can greet the user. */
export async function peekPasswordReset(token: string): Promise<ResetConsumeResult> {
  if (!token || token.length < 32) return { ok: false, error: "লিংকটি সঠিক নয়।" };
  const res = await getClient().execute({
    sql: "SELECT kind, email, principal, expires_at, used_at FROM password_resets WHERE token_hash = ? LIMIT 1",
    args: [hash(token)],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return { ok: false, error: "লিংকটি পাওয়া যায়নি বা ইতিমধ্যে ব্যবহৃত হয়েছে।" };
  if (row.used_at) return { ok: false, error: "এই লিংকটি একবারই ব্যবহার করা যায়। নতুন লিংক চান।" };
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    return { ok: false, error: "লিংকের মেয়াদ শেষ (৬০ মিনিট)। আবার অনুরোধ করুন।" };
  }
  return { ok: true, kind: String(row.kind) as ResetKind, email: String(row.email), principal: String(row.principal) };
}

export async function consumePasswordReset(token: string, password: string): Promise<ResetConsumeResult> {
  const peek = await peekPasswordReset(token);
  if (!peek.ok || !peek.kind || !peek.principal) return peek;
  if (password.length < 8) return { ...peek, ok: false, error: "পাসওয়ার্ডে অন্তত ৮টি অক্ষর থাকতে হবে।" };

  const client = getClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const now = nowIso();

  // Claim the token first. A concurrent request that loses this update must not
  // also overwrite the password.
  const claim = await client.execute({
    sql: "UPDATE password_resets SET used_at = ? WHERE token_hash = ? AND used_at IS NULL",
    args: [now, hash(token)],
  });
  if (claim.rowsAffected === 0) {
    return { ok: false, error: "এই লিংকটি ইতিমধ্যে ব্যবহৃত হয়েছে।" };
  }

  if (peek.kind === "admin") {
    await client.execute({
      sql: "UPDATE admin_users SET password_hash = ? WHERE id = ?",
      args: [passwordHash, peek.principal],
    });
    // Every old session dies with the old password.
    await client.execute({ sql: "DELETE FROM admin_sessions WHERE user_id = ?", args: [peek.principal] });
  } else {
    await client.execute({
      sql: "UPDATE ad_clients SET password_hash = ?, updated_at = ? WHERE id = ?",
      args: [passwordHash, now, peek.principal],
    });
    await client.execute({ sql: "DELETE FROM ad_client_sessions WHERE client_id = ?", args: [peek.principal] });
  }

  return { ok: true, kind: peek.kind, email: peek.email, principal: peek.principal };
}

/** Housekeeping: drop tokens past their life so the table cannot grow forever. */
export async function prunePasswordResets(): Promise<void> {
  await getClient().execute({
    sql: "DELETE FROM password_resets WHERE expires_at < ?",
    args: [nowIso()],
  });
}

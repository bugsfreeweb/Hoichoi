import { NextRequest, NextResponse } from "next/server";
import {
  getClient,
  consumeAdminLoginCode,
  logAdminLogin,
  loginLockState,
  recordLoginAttempt,
  verifyMfaLogin,
} from "@hoichoi/db";
import { hashEmail } from "@hoichoi/db";
import { createSession, getUserByEmail } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { limitRequest, LIMITS } from "@/lib/rate-limit";

/**
 * এক-বার ব্যবহারযোগ্য কোড দিয়ে অ্যাডমিন সাইন-ইন।
 *
 * Security model (do not weaken):
 * - A code only proves "someone holding this code". It must never be the thing
 *   that decides *who* becomes an admin. Account creation is gated on the
 *   ADMIN_ALLOWED_EMAILS invite list; an email that is neither invited nor
 *   already provisioned gets the same generic 401 as a bad code, so this
 *   endpoint cannot be used to discover which addresses are admins.
 * - The very first account (empty `admin_users`) is the bootstrap admin and
 *   gets `role = admin`. Every later invited account starts as `editor` and is
 *   promoted deliberately — least privilege, not convenience.
 * - The eligibility check runs BEFORE the code is consumed, so an uninvited
 *   attempt cannot burn a legitimately issued code.
 */
const GENERIC_ERROR = "invalid, used, or expired code";

function invitedEmails(): string[] {
  return (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function adminCount(): Promise<number> {
  const res = await getClient().execute("SELECT count(*) AS n FROM admin_users");
  return Number((res.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
}

export async function POST(req: NextRequest) {
  const ipLimited = await limitRequest(req, LIMITS.loginIp);
  if (ipLimited) return ipLimited;
  const body = (await req.json().catch(() => null)) as { email?: string; code?: string; totp?: string } | null;
  if (!body?.email || !body?.code) {
    return NextResponse.json({ error: "email and code required" }, { status: 400 });
  }

  const accountLimited = await limitRequest(req, { ...LIMITS.loginAccount, discriminator: body.email });
  if (accountLimited) return accountLimited;
  const email = body.email.trim().toLowerCase().slice(0, 254);

  // Lockout: five bad attempts in fifteen minutes and this email waits. The
  // counter is keyed on the email *hash*, so the attempts table is not a list of
  // who tried to sign in.
  const emailHash = hashEmail(email) ?? email.toLowerCase();
  const lock = await loginLockState(emailHash);
  if (lock.locked) {
    await recordLoginAttempt({ emailHash, ipHash: null, outcome: "locked" });
    return NextResponse.json(
      { error: `অনেকবার ভুল হয়েছে — ${Math.ceil(lock.retryAfterMs / 60_000)} মিনিট পর আবার চেষ্টা করুন।`, locked: true },
      { status: 429, headers: { "Retry-After": String(Math.ceil(lock.retryAfterMs / 1000)) } },
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  let existing = await getUserByEmail(email);
  const invited = invitedEmails().includes(email);
  if (!existing && !invited) {
    // No account and not on the invite list: refuse, and say nothing useful.
    await logAdminLogin({
      email,
      ok: false,
      ip,
      userAgent,
      message: "not invited: no admin account and email is not in ADMIN_ALLOWED_EMAILS",
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const accepted = await consumeAdminLoginCode(email, body.code);
  if (!accepted) {
    await recordLoginAttempt({ emailHash, ipHash: null, outcome: "bad_code" });
    await logAdminLogin({ email, ok: false, ip, userAgent, message: "invalid, used, or expired code" });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // Second factor: only when the account has an *enabled* factor. A code alone
  // must not be enough for a privileged account that turned MFA on. The code is
  // not consumed by the MFA check, so the operator can retry with a fresh one.
  const needsTotp = typeof body.totp !== "string" || body.totp.trim() === "";
  const mfa = await verifyMfaLogin(email, needsTotp ? "" : (body.totp as string));
  if (mfa.reason === "not_enabled") {
    // Fine — the account has no second factor yet.
  } else if (!mfa.ok) {
    await recordLoginAttempt({ emailHash, ipHash: null, outcome: "bad_code" });
    await logAdminLogin({
      email,
      ok: false,
      ip,
      userAgent,
      message: mfa.reason === "replay" ? "mfa replay refused" : needsTotp ? "mfa required but not supplied" : "mfa code refused",
    });
    return NextResponse.json(
      {
        error: needsTotp ? "এই অ্যাকাউন্টে দুই-ধাপ যাচাই চালু আছে — কোডটি দিন।" : "দুই-ধাপ কোডটি সঠিক নয়।",
        mfaRequired: true,
      },
      { status: 401 },
    );
  }

  if (!existing) {
    // Reachable only for an invited address (checked above).
    const bootstrap = (await adminCount()) === 0;
    const role = bootstrap ? "admin" : "editor";
    await getClient().execute({
      sql: "INSERT OR IGNORE INTO admin_users (id, email, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        randomUUID(),
        email,
        email.split("@")[0] ?? "হৈচৈ ডেস্ক",
        /* placeholder — these accounts sign in via one-time codes, never passwords */
        bcrypt.hashSync(randomBytes(24).toString("base64"), 10),
        role,
        new Date().toISOString(),
      ],
    });
    existing = await getUserByEmail(email);
    await logAdminLogin({
      email,
      ok: true,
      ip,
      userAgent,
      message: bootstrap ? "bootstrap admin provisioned" : `invited admin provisioned as ${role}`,
    });
  }

  if (!existing) {
    await logAdminLogin({ email, ok: false, ip, userAgent, message: "no admin account for that email" });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const user = existing;
  await recordLoginAttempt({ emailHash, ipHash: null, outcome: "ok" });
  await createSession(user);
  await logAdminLogin({ email, ok: true, ip, userAgent });
  return NextResponse.json({ admin: user, ok: true });
}

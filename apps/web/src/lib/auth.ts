import { getClient } from "@hoichoi/db";
import type { AdminRole, AdminUser } from "@hoichoi/shared-types";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { nextExpiry, sessionState, shouldTouch } from "./session-policy";

export const SESSION_COOKIE = "hoichoi_session";
/**
 * Legacy constant kept only so older imports keep compiling. The real lifetime
 * lives in `lib/session-policy.ts`: 30 days absolute, 7 days idle.
 */
export const SESSION_MAX_AGE_MS = 30 * 24 * 3600 * 1000;

/** Stable pseudo-id for a device, kept in its own long-lived cookie. */
const DEVICE_COOKIE = "hc_device";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Hash a value that identifies a person (IP, user agent) before it is stored.
 * The session list only needs to tell two sessions apart, so the raw value is
 * never persisted. `ADMIN_AUTH_SECRET` is the HMAC key when configured.
 */
function hashValue(value: string): string {
  const key = process.env.ADMIN_AUTH_SECRET?.trim() || "hoichoi-session-hash";
  return createHmac("sha256", key).update(value).digest("hex").slice(0, 32);
}

/** Minimal UA reading: enough to name a device, not a fingerprinting engine. */
function describeDevice(userAgent: string | null): { name: string; os: string } {
  const ua = userAgent ?? "";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(ua)
        ? "iOS"
        : /Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "অজানা";
  const name = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\//i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Safari\//i.test(ua)
          ? "Safari"
          : /Firefox\//i.test(ua)
            ? "Firefox"
            : /hoichoi|tauri/i.test(ua)
              ? "Hoichoi Desk"
              : "অজানা ব্রাউজার";
  return { name, os };
}

async function deviceFromRequest(): Promise<{
  deviceId: string;
  deviceName: string;
  deviceOs: string;
  ipHash: string | null;
  userAgentHash: string | null;
}> {
  const h = await headers();
  const store = await cookies();
  let deviceId = store.get(DEVICE_COOKIE)?.value ?? null;
  if (!deviceId) {
    deviceId = randomBytes(12).toString("hex");
    store.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 365 * 24 * 3600,
    });
  }
  const ua = h.get("user-agent");
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const { name, os } = describeDevice(ua);
  return {
    deviceId,
    deviceName: name,
    deviceOs: os,
    ipHash: ip ? hashValue(ip) : null,
    userAgentHash: ua ? hashValue(ua) : null,
  };
}

/** Verify password against the stored bcrypt hash. */
export async function verifyPassword(email: string, password: string): Promise<AdminUser | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM admin_users WHERE email = ? LIMIT 1",
    args: [email.trim().toLowerCase()],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  const ok = await bcrypt.compare(password, String(row.password_hash));
  if (!ok) return null;
  return {
    user_id: String(row.id),
    email: String(row.email),
    display_name: (row.display_name as string) ?? null,
    role: row.role as AdminRole,
    created_at: String(row.created_at),
  };
}

/** Load an admin user by email (no password check). */
export async function getUserByEmail(email: string): Promise<AdminUser | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM admin_users WHERE email = ? LIMIT 1",
    args: [email.trim().toLowerCase()],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return {
    user_id: String(row.id),
    email: String(row.email),
    display_name: (row.display_name as string) ?? null,
    role: row.role as AdminRole,
    created_at: String(row.created_at),
  };
}

/**
 * Create a session row + matching HttpOnly cookie.
 * Expiry is `min(created + 30d, now + 7d)` and slides no further than the
 * absolute deadline — see `lib/session-policy.ts`.
 */
export async function createSession(user: AdminUser): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const client = getClient();
  const now = new Date();
  const device = await deviceFromRequest();
  await client.execute({
    sql: `INSERT INTO admin_sessions
            (token_hash, user_id, created_at, expires_at, device_id, device_name, device_os,
             ip_hash, user_agent_hash, last_used_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      hashToken(token),
      user.user_id,
      now.toISOString(),
      new Date(nextExpiry(now.getTime(), now.getTime())).toISOString(),
      device.deviceId,
      device.deviceName,
      device.deviceOs,
      device.ipHash,
      device.userAgentHash,
      now.toISOString(),
    ],
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

/**
 * Sign out. The row is kept and stamped `revoked_at` instead of being deleted,
 * so the security screen and the audit trail can show that this device signed
 * out — and so a copy of the cookie stops working even if it was stolen.
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const client = getClient();
    await client.execute({
      sql: "UPDATE admin_sessions SET revoked_at = ?, revoked_reason = 'logout', last_used_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
      args: [new Date().toISOString(), new Date().toISOString(), hashToken(token)],
    });
  }
  store.delete(SESSION_COOKIE);
}

export interface AdminSessionInfo {
  /** Prefix of the token hash — safe to show, enough to revoke by. */
  id: string;
  user: AdminUser;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
}

/** Resolve the current admin + session, enforcing the lifetime policy. */
export async function currentSession(): Promise<AdminSessionInfo | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT s.created_at AS s_created, s.expires_at, s.last_used_at, s.revoked_at,
                 u.id, u.email, u.display_name, u.role, u.created_at AS u_created
          FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
          WHERE s.token_hash = ? LIMIT 1`,
    args: [tokenHash],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  const now = Date.now();
  const state = sessionState(
    {
      created_at: String(row.s_created),
      last_used_at: (row.last_used_at as string) ?? null,
      revoked_at: (row.revoked_at as string) ?? null,
    },
    now,
  );
  if (state !== "active") {
    if (state === "expired" || state === "idle") {
      // Housekeeping: an aged-out row has no further use.
      await client.execute({ sql: "DELETE FROM admin_sessions WHERE token_hash = ?", args: [tokenHash] });
    }
    return null;
  }

  const allowed = process.env.ADMIN_ALLOWED_EMAILS?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = String(row.email);
  if (allowed && allowed.length > 0 && !allowed.includes(email)) return null;

  if (shouldTouch((row.last_used_at as string) ?? null, now)) {
    await client.execute({
      sql: "UPDATE admin_sessions SET last_used_at = ?, expires_at = ? WHERE token_hash = ?",
      args: [new Date(now).toISOString(), new Date(nextExpiry(Date.parse(String(row.s_created)), now)).toISOString(), tokenHash],
    });
  }

  return {
    id: tokenHash.slice(0, 16),
    user: {
      user_id: String(row.id),
      email,
      display_name: (row.display_name as string) ?? null,
      role: row.role as AdminRole,
      created_at: String(row.u_created),
    },
    created_at: String(row.s_created),
    expires_at: String(row.expires_at),
    last_used_at: (row.last_used_at as string) ?? null,
  };
}

/** Resolve current admin from cookie; slides the deadline within the 30-day cap. */
export async function currentUser(): Promise<AdminUser | null> {
  const session = await currentSession();
  return session?.user ?? null;
}

export function requiresRole(user: AdminUser | null, minRole: AdminRole): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (minRole === "admin") return false;
  if (minRole === "editor") return user.role === "editor";
  return true; // moderator can do moderator+editor+view
}

/** Server-component gate: redirect to /admin/login when unauthenticated. */
export async function requirePageUser(): Promise<AdminUser> {
  const user = await currentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
    return user!;
  }
  return user;
}

/** API gate returning a JSON 401 when unauthenticated. */
export async function requireApiUser(): Promise<AdminUser | null> {
  const user = await currentUser();
  if (!user) {
    return null;
  }
  return user;
}

/**
 * API gate for a minimum role. Every admin route should use this rather than
 * "is somebody signed in" — a moderator must not be able to rotate provider
 * keys or wipe content just because they hold a session.
 */
export async function requireApiRole(minRole: AdminRole): Promise<{ user: AdminUser } | { response: NextResponse }> {
  const user = await currentUser();
  if (!user) return { response: unauthorized() };
  if (!requiresRole(user, minRole)) return { response: forbidden() };
  return { user };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

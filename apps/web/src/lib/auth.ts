import { getClient } from "@hoichoi/db";
import type { AdminRole, AdminUser } from "@hoichoi/shared-types";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "hoichoi_session";
/** Admin sessions persist until the browser clears site data (or the desktop
 *  revokes them). Sliding — each active request extends the deadline. */
const SESSION_MAX_AGE_MS = 365 * 24 * 3600 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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

/** Create a session row + matching HttpOnly cookie (persistent, no expiry gate). */
export async function createSession(user: AdminUser): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const client = getClient();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  await client.execute({
    sql: "INSERT INTO admin_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [hashToken(token), user.user_id, now.toISOString(), expires.toISOString()],
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

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const client = getClient();
    await client.execute({
      sql: "DELETE FROM admin_sessions WHERE token_hash = ?",
      args: [hashToken(token)],
    });
  }
  store.delete(SESSION_COOKIE);
}

/** Resolve current admin from cookie; slides the DB deadline on each hit. */
export async function currentUser(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT u.* FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id WHERE token_hash = ? LIMIT 1",
    args: [hashToken(token)],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  // Sliding expiry — sessions only die when the browser forgets the cookie or
  // the desktop revokes the email's sessions.
  await client.execute({
    sql: "UPDATE admin_sessions SET expires_at = ? WHERE token_hash = ?",
    args: [
      new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString(),
      hashToken(token),
    ],
  });
  const allowed = process.env.ADMIN_ALLOWED_EMAILS?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = String(row.email);
  if (allowed && allowed.length > 0 && !allowed.includes(email)) return null;
  return {
    user_id: String(row.id),
    email,
    display_name: (row.display_name as string) ?? null,
    role: row.role as AdminRole,
    created_at: String(row.created_at),
  };
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

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
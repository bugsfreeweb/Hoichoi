import "server-only";

import { getClient } from "@hoichoi/db";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "hoichoi_ad_client";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface AdClientUser {
  id: string;
  name: string;
  email: string;
  company: string | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdClientSession(clientId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();
  await getClient().execute({
    sql: "INSERT INTO ad_client_sessions (token_hash, client_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [hashToken(token), clientId, new Date().toISOString(), expiresAt],
  });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function currentAdClient(): Promise<AdClientUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const result = await getClient().execute({
    sql: `SELECT c.id, c.name, c.email, c.company
      FROM ad_client_sessions s
      JOIN ad_clients c ON c.id = s.client_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND c.status = 'approved'
      LIMIT 1`,
    args: [hashToken(token), new Date().toISOString()],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    company: row.company ? String(row.company) : null,
  };
}

export async function destroyAdClientSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await getClient().execute({
      sql: "DELETE FROM ad_client_sessions WHERE token_hash = ?",
      args: [hashToken(token)],
    });
  }
  store.delete(COOKIE_NAME);
}

export async function requireAdClient(): Promise<AdClientUser> {
  const client = await currentAdClient();
  if (!client) redirect("/portal/login");
  return client;
}

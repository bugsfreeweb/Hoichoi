import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DEFAULT_PASSWORD } from "@/lib/types";

const SESSION_COOKIE = "mc_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.DATABASE_URL || "mc-dev-secret";
}

export function hashPassword(pw: string) {
  return createHash("sha256").update(pw.trim()).digest("hex");
}

export function verifyPassword(pw: string, storedHash: string) {
  const expected = storedHash?.length ? storedHash : hashPassword(DEFAULT_PASSWORD);
  const got = hashPassword(pw);
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession() {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function isAuthed() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  if (role !== "admin") return false;
  if (Number(exp) < Date.now()) return false;
  const expected = sign(`${role}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

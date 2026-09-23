import { NextRequest, NextResponse } from "next/server";
import { getClient, consumeAdminLoginCode, logAdminLogin } from "@hoichoi/db";
import { createSession, getUserByEmail } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; code?: string } | null;
  if (!body?.email || !body?.code) {
    return NextResponse.json({ error: "email and code required" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  const accepted = await consumeAdminLoginCode(email, body.code);
  if (!accepted) {
    await logAdminLogin({ email, ok: false, ip, userAgent, message: "invalid, used, or expired code" });
    return NextResponse.json({ error: "invalid, used, or expired code" }, { status: 401 });
  }
  let user = await getUserByEmail(email);
  if (!user) {
    // Desktop mints login codes without an admin_users row — provision the
    // account on first successful code use so the no-password flow works.
    const client = getClient();
    await client.execute({
      sql: "INSERT OR IGNORE INTO admin_users (id, email, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)",
      args: [
        randomUUID(),
        email,
        email.split("@")[0] ?? "হৈচৈ ডেস্ক",
        /* placeholder — these accounts sign in via one-time codes, never passwords */
        bcrypt.hashSync(randomBytes(24).toString("base64"), 10),
        new Date().toISOString(),
      ],
    });
    user = await getUserByEmail(email);
  }
  if (!user) {
    await logAdminLogin({ email, ok: false, ip, userAgent, message: "no admin account for that email" });
    return NextResponse.json({ error: "no admin account for that email" }, { status: 401 });
  }
  await createSession(user);
  await logAdminLogin({ email, ok: true, ip, userAgent });
  return NextResponse.json({ admin: user, ok: true });
}
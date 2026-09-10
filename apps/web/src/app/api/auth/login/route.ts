import { NextRequest, NextResponse } from "next/server";
import { consumeAdminLoginCode } from "@hoichoi/db";
import { createSession, getUserByEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; code?: string } | null;
  if (!body?.email || !body?.code) {
    return NextResponse.json({ error: "email and code required" }, { status: 400 });
  }
  const accepted = await consumeAdminLoginCode(body.email, body.code);
  if (!accepted) {
    return NextResponse.json({ error: "invalid, used, or expired code" }, { status: 401 });
  }
  const user = await getUserByEmail(body.email);
  if (!user) {
    return NextResponse.json({ error: "no admin account for that email" }, { status: 401 });
  }
  await createSession(user);
  return NextResponse.json({ admin: user, ok: true });
}
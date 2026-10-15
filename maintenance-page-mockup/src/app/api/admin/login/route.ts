import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

  const s = await getSettings();
  if (!verifyPassword(password, s.security.passwordHash)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}

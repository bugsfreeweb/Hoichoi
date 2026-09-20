import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_SECONDS, adminMode, secretMatches, signSession, sessionFor, sameOrigin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(req: Request) {
  return NextResponse.json(sessionFor(req), { headers });
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (adminMode() === "unconfigured") return NextResponse.json({ error: "Web-এ ADMIN_SECRET (অন্তত ২৪ অক্ষর) সেট করুন।" }, { status: 503 });
  try {
    const payload = await req.json();
    if (adminMode() === "protected" && (typeof payload.secret !== "string" || payload.secret.length > 256 || !secretMatches(payload.secret, process.env.ADMIN_SECRET!))) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return NextResponse.json({ error: "অ্যাডমিন কী সঠিক নয়।" }, { status: 401 });
    }
    const response = NextResponse.json({ authenticated: true, mode: adminMode() }, { headers });
    if (adminMode() === "protected") response.cookies.set(ADMIN_COOKIE, signSession(), {
      httpOnly: true, secure: new URL(req.url).protocol === "https:", sameSite: "strict", path: "/", maxAge: SESSION_SECONDS,
    });
    return response;
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "strict" });
  return response;
}

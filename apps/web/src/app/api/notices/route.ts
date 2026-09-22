import { NextRequest, NextResponse } from "next/server";
import { listNotices, createNotice } from "@hoichoi/db";
import type { NoticeTone } from "@hoichoi/shared-types";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

const TONES: NoticeTone[] = ["info", "success", "warn", "alert"];

/** Public: active notices for the bell, or all (admin) with ?all=1. */
export async function GET(req: NextRequest) {
  const wantAll = new URL(req.url).searchParams.get("all") === "1";
  if (wantAll) {
    const user = await requireApiUser();
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden();
    const notices = await listNotices({ limit: 200 });
    return NextResponse.json({ notices });
  }
  const notices = await listNotices({ activeOnly: true, limit: 50 });
  return NextResponse.json({ notices });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const tone = TONES.includes(body.tone as NoticeTone) ? (body.tone as NoticeTone) : "info";
  const notice = await createNotice({
    title: body.title.trim(),
    body: typeof body.body === "string" && body.body.trim() ? body.body.trim() : null,
    tone,
    url: typeof body.url === "string" && body.url.trim() ? body.url.trim() : null,
    pinned: body.pinned === true,
    is_active: body.active !== false,
    expires_at: typeof body.expiresAt === "string" && body.expiresAt.trim() ? body.expiresAt.trim() : null,
    created_by: "web",
  });
  return NextResponse.json({ notice }, { status: 201 });
}
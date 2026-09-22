import { NextRequest, NextResponse } from "next/server";
import { getNotice, updateNotice, deleteNotice } from "@hoichoi/db";
import type { NoticeTone } from "@hoichoi/shared-types";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

const TONES: NoticeTone[] = ["info", "success", "warn", "alert"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await params;
  const existing = await getNotice(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const fields: Parameters<typeof updateNotice>[1] = {};
  if (typeof body.title === "string") fields.title = body.title.trim();
  if (typeof body.body === "string") fields.body = body.body.trim() || null;
  if (typeof body.tone === "string" && TONES.includes(body.tone as NoticeTone)) {
    fields.tone = body.tone as NoticeTone;
  }
  if (typeof body.url === "string") fields.url = body.url.trim() || null;
  if (typeof body.pinned === "boolean") fields.pinned = body.pinned;
  if (typeof body.active === "boolean") fields.is_active = body.active;
  if (typeof body.expiresAt === "string") fields.expires_at = body.expiresAt.trim() || null;

  const notice = await updateNotice(id, fields);
  return NextResponse.json({ notice });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await params;
  const existing = await getNotice(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await deleteNotice(id);
  return NextResponse.json({ ok: true });
}
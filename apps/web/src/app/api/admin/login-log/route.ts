import { NextRequest, NextResponse } from "next/server";
import { listLoginLog, clearLoginLog, deleteLoginLog } from "@hoichoi/db";
import { requireApiUser, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("perPage") ?? 100)));
  const data = await listLoginLog(page, perPage);
  return NextResponse.json({ ok: true, ...data });
}

export async function DELETE(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    await deleteLoginLog(id);
    return NextResponse.json({ ok: true });
  }
  const cleared = await clearLoginLog();
  return NextResponse.json({ ok: true, cleared });
}
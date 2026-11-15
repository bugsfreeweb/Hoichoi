import { NextRequest, NextResponse } from "next/server";
import { listLoginLog, clearLoginLog, deleteLoginLog } from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("perPage") ?? 100)));
  const data = await listLoginLog(page, perPage);
  return NextResponse.json({ ok: true, ...data });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    await deleteLoginLog(id);
    await audit(user, { action: "login_log.delete", entityType: "login_log", entityId: id, summary: "একটি লগইন লগ এন্ট্রি মুছে ফেলা হয়েছে" }, req);
    return NextResponse.json({ ok: true });
  }
  const cleared = await clearLoginLog();
  await audit(user, { action: "login_log.clear", entityType: "login_log", summary: "সব লগইন লগ মুছে ফেলা হয়েছে", metadata: { cleared } }, req);
  return NextResponse.json({ ok: true, cleared });
}
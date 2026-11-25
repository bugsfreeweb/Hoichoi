import { NextRequest, NextResponse } from "next/server";
import { listLoginLog, deleteLoginLog } from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  const page = Math.max(
    1,
    Number(new URL(req.url).searchParams.get("page") ?? 1),
  );
  const perPage = Math.min(
    100,
    Math.max(1, Number(new URL(req.url).searchParams.get("perPage") ?? 100)),
  );
  const data = await listLoginLog(page, perPage);
  return NextResponse.json({ ok: true, ...data });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    // Clearing the whole log is its own endpoint. A missing id must never turn
    // a single-row delete into a bulk erase.
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteLoginLog(id);
  await audit(
    user,
    {
      action: "login_log.delete",
      entityType: "login_log",
      entityId: id,
      summary: "একটি লগইন লগ এন্ট্রি মুছে ফেলা হয়েছে",
    },
    req,
  );
  return NextResponse.json({ ok: true });
}

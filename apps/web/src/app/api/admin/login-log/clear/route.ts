import { NextRequest, NextResponse } from "next/server";
import { clearLoginLog } from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function DELETE(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  const cleared = await clearLoginLog();
  await audit(
    user,
    {
      action: "login_log.clear",
      entityType: "login_log",
      summary: "সব লগইন লগ মুছে ফেলা হয়েছে",
      metadata: { cleared },
    },
    req,
  );
  return NextResponse.json({ ok: true, cleared });
}

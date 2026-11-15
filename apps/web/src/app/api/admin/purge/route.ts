import { NextRequest, NextResponse } from "next/server";
import { purgeExpired } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();
  const result = await purgeExpired();
  await audit(user, { action: "data.purge", entityType: "system", summary: "পুরনো ডেটা পরিষ্কার", metadata: { ...result } }, req);
  return NextResponse.json({ ok: true, ...result });
}
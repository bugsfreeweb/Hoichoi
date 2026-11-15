import { NextResponse } from "next/server";
import { resetContent, getClient } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";

export async function POST() {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const { wiped } = await resetContent(getClient());
  return NextResponse.json({ ok: true, wiped });
}
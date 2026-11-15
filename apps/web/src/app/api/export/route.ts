import { NextResponse } from "next/server";
import { gatherExportBundle, getClient } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";

export async function POST() {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const bundle = await gatherExportBundle(getClient());
  return NextResponse.json({ ok: true, bundle });
}
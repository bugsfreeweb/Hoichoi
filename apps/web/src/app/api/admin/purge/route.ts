import { NextResponse } from "next/server";
import { purgeExpired } from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function POST() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const result = await purgeExpired();
  return NextResponse.json({ ok: true, ...result });
}
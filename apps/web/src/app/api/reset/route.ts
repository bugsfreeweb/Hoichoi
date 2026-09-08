import { NextResponse } from "next/server";
import { resetContent, getClient } from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function POST() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { wiped } = await resetContent(getClient());
  return NextResponse.json({ ok: true, wiped });
}
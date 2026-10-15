import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireApiUser, requiresRole, unauthorized, forbidden } from "@/lib/auth";
import { DEFAULT_VARIANT, PRESETS } from "@hoichoi/shared-types";

export const dynamic = "force-dynamic";

const COOKIE = "hoichoi-preview-variant";

/**
 * POST /api/admin/preview  body: { variant: string }
 * Sets a short-lived, admin-only cookie so the public site renders the chosen
 * design look in memory (see `loadLive`) — a true preview before applying.
 * DELETE clears the preview and the site returns to the saved design.
 */
export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (!requiresRole(user, "admin")) return forbidden();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "অবৈধ অনুরোধ।" }, { status: 400 });
  }

  const variant = typeof body.variant === "string" ? body.variant : "";
  const known = variant === DEFAULT_VARIANT || PRESETS.some((p) => p.id === variant);
  if (!known) return NextResponse.json({ ok: false, error: "অজানা ভ্যারিয়েন্ট।" }, { status: 400 });

  const jar = await cookies();
  jar.set(COOKIE, variant, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 30,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const jar = await cookies();
  jar.delete(COOKIE);
  return NextResponse.json({ ok: true });
}

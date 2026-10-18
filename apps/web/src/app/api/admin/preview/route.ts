import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireApiUser, requiresRole, unauthorized, forbidden } from "@/lib/auth";
import { DEFAULT_VARIANT, PRESETS, getSectionMeta } from "@hoichoi/shared-types";
import { encodePreviewDraft, PREVIEW_COOKIE, type PreviewDraft } from "@/lib/mv/live";

export const dynamic = "force-dynamic";

interface IncomingSection {
  key?: unknown;
  variant?: unknown;
  enabled?: unknown;
}

/**
 * POST /api/admin/preview
 * Body: { siteVariant?: string, sections?: Array<{ key, variant, enabled }> }
 *   or legacy { variant: string }
 *
 * Persists a short-lived (30 min), admin-only cookie describing the design
 * draft. The public site renders that draft in memory (see `getLive`), so the
 * admin can inspect a whole-site look — every section's variant and its
 * show/hide state — before committing anything to the database.
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

  const draft: PreviewDraft = {};

  if (typeof body.siteVariant === "string") {
    const site = body.siteVariant;
    if (site !== DEFAULT_VARIANT && !PRESETS.some((p) => p.id === site)) {
      return NextResponse.json({ ok: false, error: "অজানা ভ্যারিয়েন্ট।" }, { status: 400 });
    }
    draft.site = site;
  }

  if (Array.isArray(body.sections)) {
    const overrides: Record<string, { variant?: string; enabled?: boolean }> = {};
    for (const raw of body.sections as IncomingSection[]) {
      if (!raw || typeof raw.key !== "string") continue;
      const meta = getSectionMeta(raw.key);
      if (!meta) continue;
      const variant =
        typeof raw.variant === "string" && meta.variants.some((v) => v.id === raw.variant)
          ? raw.variant
          : undefined;
      const enabled = typeof raw.enabled === "boolean" ? raw.enabled : undefined;
      if (variant !== undefined || enabled !== undefined) overrides[raw.key] = { variant, enabled };
    }
    if (Object.keys(overrides).length > 0) draft.overrides = overrides;
  }

  // Legacy shape: a bare preset id.
  if (!draft.site && !draft.overrides && typeof body.variant === "string") {
    const variant = body.variant;
    if (variant !== DEFAULT_VARIANT && !PRESETS.some((p) => p.id === variant)) {
      return NextResponse.json({ ok: false, error: "অজানা ভ্যারিয়েন্ট।" }, { status: 400 });
    }
    draft.site = variant;
  }

  if (!draft.site && !draft.overrides) {
    return NextResponse.json({ ok: false, error: "কোনো প্রিভিউ ডেটা পাওয়া যায়নি।" }, { status: 400 });
  }

  const jar = await cookies();
  jar.set(PREVIEW_COOKIE, encodePreviewDraft(draft), {
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
  jar.delete(PREVIEW_COOKIE);
  return NextResponse.json({ ok: true });
}

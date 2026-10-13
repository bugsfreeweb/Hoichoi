import { NextResponse } from "next/server";
import { requireApiUser, requiresRole, unauthorized, forbidden } from "@/lib/auth";
import { listSections, setSectionState, getSiteVariant, setSiteVariant } from "@hoichoi/db";
import { DEFAULT_VARIANT, PRESETS } from "@hoichoi/shared-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sections
 * Admin/editor — the section registry merged with persisted variant choices.
 * Today every section resolves to the shipped `"default"` variant; the endpoint
 * is the seam for the optional mockup variant engine.
 */
export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  try {
    const [sections, siteVariant] = await Promise.all([listSections(), getSiteVariant()]);
    return NextResponse.json({ ok: true, sections, siteVariant, defaultVariant: DEFAULT_VARIANT });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "সেকশন তালিকা পাওয়া যায়নি।" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/sections
 * Admin only — set the site-wide default variant, or a single section's
 * variant/enabled flag. Unknown variants are rejected by the data layer.
 * Body: { siteVariant?: string } | { key: string, variant?: string, enabled?: boolean }
 */
export async function PUT(request: Request) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (!requiresRole(user, "admin")) return forbidden();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "অবৈধ অনুরোধ।" }, { status: 400 });
  }

  try {
    if (typeof body.siteVariant === "string") {
      const ok = await setSiteVariant(body.siteVariant);
      if (!ok) return NextResponse.json({ ok: false, error: "অজানা ভ্যারিয়েন্ট।" }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    // Whole-site preset: applies every section's value from `PRESETS` and
    // records the look id as the site-wide default.
    if (typeof body.preset === "string") {
      const preset = PRESETS.find((p) => p.id === body.preset);
      if (!preset) return NextResponse.json({ ok: false, error: "অজানা প্রিসেট।" }, { status: 400 });
      for (const [key, variant] of Object.entries(preset.values)) {
        await setSectionState(key, { variant });
      }
      await setSiteVariant(preset.id);
      return NextResponse.json({ ok: true });
    }

    if (typeof body.key === "string") {
      const ok = await setSectionState(body.key, {
        variant: typeof body.variant === "string" ? body.variant : undefined,
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
        sort_order: typeof body.sort_order === "number" ? body.sort_order : undefined,
      });
      if (!ok) return NextResponse.json({ ok: false, error: "অজানা সেকশন বা ভ্যারিয়েন্ট।" }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "siteVariant অথবা key প্রয়োজন।" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "সেভ করা যায়নি।" },
      { status: 500 },
    );
  }
}

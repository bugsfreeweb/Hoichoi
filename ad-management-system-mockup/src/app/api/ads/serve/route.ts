import { NextResponse } from "next/server";
import { serveSlot } from "@/lib/ads/serve";
import { SLOTS, SLOT_MAP } from "@/lib/ads/slots";
import type { LangCode } from "@/lib/ads/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/ads/serve?slot=home_hero_below&lang=bn
 * GET /api/ads/serve            → full inventory snapshot
 *
 * Lets any surface (AMP page, mobile app, third-party embed) pull the same
 * creative the website renders.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slot = searchParams.get("slot");
  const lang = (searchParams.get("lang") as LangCode) || "bn";

  if (!slot) {
    const inventory = await Promise.all(
      SLOTS.map(async (s) => {
        const ad = await serveSlot(s.key, lang);
        return {
          slot: s.key,
          label: s.label,
          page: s.page,
          format: s.format,
          size: s.size,
          dayRate: s.dayRate,
          existsOnSite: s.existing,
          filled: Boolean(ad),
          ref: ad?.ref ?? null,
        };
      })
    );
    return NextResponse.json({ ok: true, count: inventory.length, inventory });
  }

  if (!SLOT_MAP[slot]) {
    return NextResponse.json({ ok: false, error: "unknown slot" }, { status: 404 });
  }

  const ad = await serveSlot(slot, lang);
  return NextResponse.json({
    ok: true,
    slot,
    format: SLOT_MAP[slot].format,
    filled: Boolean(ad),
    creative: ad,
  });
}

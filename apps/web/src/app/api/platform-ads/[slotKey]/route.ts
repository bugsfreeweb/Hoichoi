import { getActiveAdForSlot, getAdSlot } from "@hoichoi/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slotKey: string }> },
) {
  const { slotKey } = await params;
  if (!/^[a-z0-9][a-z0-9_-]{1,59}$/.test(slotKey)) {
    return NextResponse.json({ ad: null }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const slot = await getAdSlot(slotKey);
    if (!slot?.enabled || slot.deliveryMode === "house") {
      return NextResponse.json({ ad: null }, { headers: { "Cache-Control": "no-store" } });
    }
    const ad = await getActiveAdForSlot(slotKey);
    const data = ad?.data && typeof ad.data === "object" && !Array.isArray(ad.data) ? ad.data : {};
    return NextResponse.json(
      { ad: ad ? { bookingId: ad.bookingId, slotKey, name: ad.name, templateId: ad.templateId, palette: ad.palette, data } : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[platform-ads] unable to load slot", { slotKey, error });
    return NextResponse.json(
      { error: "বিজ্ঞাপন লোড করা যায়নি।" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

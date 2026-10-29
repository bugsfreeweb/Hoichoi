import { NextResponse } from "next/server";
import { liveSnapshot } from "@/lib/ads/analytics";

export const dynamic = "force-dynamic";

/** Polled every few seconds by the real-time bars in both consoles. */
export async function GET() {
  try {
    const snap = await liveSnapshot();
    return NextResponse.json(
      { ok: true, ...snap },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

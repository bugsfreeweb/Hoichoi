import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adEvents, bookings } from "@/db/schema";

export const dynamic = "force-dynamic";

/** POST { bookingId, slotKey, kind: "impression" | "click", path } */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bookingId = Number(body.bookingId) || null;
    const slotKey = String(body.slotKey ?? "");
    const kind = body.kind === "click" ? "click" : "impression";

    if (!slotKey) return NextResponse.json({ ok: false }, { status: 400 });

    await db.insert(adEvents).values({
      bookingId,
      slotKey,
      kind,
      path: String(body.path ?? ""),
      device: String(body.device ?? "web"),
    });

    if (bookingId) {
      await db
        .update(bookings)
        .set(
          kind === "click"
            ? { clicks: sql`${bookings.clicks} + 1` }
            : { impressions: sql`${bookings.impressions} + 1` }
        )
        .where(eq(bookings.id, bookingId));
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { DEFAULT_BRAND } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
    const current = {
      ...DEFAULT_BRAND,
      ...((rows[0]?.brand as Partial<typeof DEFAULT_BRAND>) ?? {}),
      motion: rows[0]?.motion ?? true,
      density: rows[0]?.density ?? DEFAULT_BRAND.density,
    };
    const next = { ...current, ...body };
    if (typeof next.motion !== "boolean") next.motion = true;
    if (!["compact", "comfortable", "spacious"].includes(next.density)) next.density = "comfortable";

    const payload = {
      brand: next as unknown as Record<string, unknown>,
      motion: next.motion,
      density: next.density,
      updatedAt: new Date(),
    };
    if (rows.length) {
      await db.update(siteSettings).set(payload).where(eq(siteSettings.id, 1));
    } else {
      await db.insert(siteSettings).values({ id: 1, ...payload });
    }
    return NextResponse.json({ ok: true, db: true, brand: next });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: false, error: err instanceof Error ? err.message : "db unavailable" },
      { status: 200 },
    );
  }
}

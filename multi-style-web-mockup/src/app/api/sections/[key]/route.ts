import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sections as sectionsTable } from "@/db/schema";
import { getSectionMeta } from "@/lib/registry";

export const dynamic = "force-dynamic";

interface PatchBody {
  variant?: string;
  visible?: boolean;
  position?: number;
  config?: Record<string, unknown>;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const meta = getSectionMeta(key);
  if (!meta) {
    return NextResponse.json({ ok: false, error: `unknown section "${key}"` }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.variant === "string") {
    if (!meta.variants.some((v) => v.id === body.variant)) {
      return NextResponse.json({ ok: false, error: `unknown variant "${body.variant}"` }, { status: 400 });
    }
    patch.variant = body.variant;
  }
  if (typeof body.visible === "boolean") patch.visible = body.visible;
  if (typeof body.position === "number") patch.position = body.position;
  if (body.config && typeof body.config === "object") patch.config = body.config;

  try {
    const updated = await db
      .update(sectionsTable)
      .set(patch)
      .where(eq(sectionsTable.key, key))
      .returning();
    if (!updated.length) {
      await db.insert(sectionsTable).values({
        key: meta.key,
        scope: meta.scope,
        zone: meta.zone,
        label: meta.label,
        labelEn: meta.labelEn,
        description: meta.description,
        variant: (body.variant as string) ?? meta.defaultVariant,
        visible: body.visible ?? meta.defaultVisible,
        position: body.position ?? 0,
        config: body.config ?? {},
      });
    }
    return NextResponse.json({ ok: true, db: true, key });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: false, error: err instanceof Error ? err.message : "db unavailable" },
      { status: 200 },
    );
  }
}

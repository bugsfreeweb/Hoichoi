import { and, eq, lte, gte, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, creatives, advertisers, slotConfig } from "@/db/schema";
import { TEMPLATE_MAP } from "./templates";
import { SLOT_MAP } from "./slots";
import type { CreativeData, LangCode } from "./types";
import type { CreativeStyle } from "./style";
import { isBlockLayout, type BlockLayout } from "./blocks";
import { translateCreative } from "./translate";

export interface ServedAd {
  bookingId: number;
  ref: string;
  slotKey: string;
  templateId: string;
  kind: string;
  palette: string;
  data: CreativeData;
  advertiser: string;
  url?: string;
  style?: CreativeStyle | null;
  layout?: BlockLayout | null;
}

/**
 * Picks the live creative for a slot.
 * Automatic: only `active`/`scheduled` bookings inside their date window are
 * eligible; highest priority then newest wins. Admin can force a winner by
 * bumping `priority`.
 */
/** Choose the right language variant of a saved block layout. */
function pickLayout(raw: unknown, lang: LangCode): BlockLayout | null {
  if (!isBlockLayout(raw)) return null;
  const layout = raw as BlockLayout;
  if (lang === "bn" || !layout.i18n) return layout;
  return layout.i18n[lang] ?? layout;
}

export async function serveSlot(
  slotKey: string,
  lang: LangCode = "bn"
): Promise<ServedAd | null> {
  try {
    const cfg = await db
      .select()
      .from(slotConfig)
      .where(eq(slotConfig.slotKey, slotKey))
      .limit(1);
    if (cfg[0] && cfg[0].enabled === false) return null;

    const now = new Date();
    const rows = await db
      .select({
        b: bookings,
        c: creatives,
        a: advertisers,
      })
      .from(bookings)
      .innerJoin(creatives, eq(bookings.creativeId, creatives.id))
      .innerJoin(advertisers, eq(bookings.advertiserId, advertisers.id))
      .where(
        and(
          eq(bookings.slotKey, slotKey),
          eq(bookings.status, "active"),
          lte(bookings.startsAt, now),
          gte(bookings.endsAt, now)
        )
      )
      .orderBy(desc(bookings.priority), desc(bookings.id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const tpl = TEMPLATE_MAP[row.c.templateId];
    if (!tpl) return null;

    const base = (row.c.data ?? {}) as CreativeData;
    const i18n = (row.c.i18n ?? {}) as Record<string, CreativeData>;
    const data =
      lang !== (row.c.baseLang as LangCode) && row.c.autoTranslate
        ? i18n[lang] ?? translateCreative(base, lang)
        : base;

    return {
      bookingId: row.b.id,
      ref: row.b.ref,
      slotKey,
      templateId: tpl.id,
      kind: tpl.kind,
      palette: row.c.palette || tpl.palette,
      data: { ...tpl.data, ...data },
      advertiser: row.a.company || row.a.name,
      url: data.url ?? tpl.data.url,
      style: (row.c.style ?? null) as CreativeStyle | null,
      layout: pickLayout(row.c.layout, lang),
    };
  } catch {
    // DB not ready → fall back to the house ad, never break the page
    return null;
  }
}

/** Serve many slots in one round-trip-ish call (used by page shells). */
export async function serveSlots(
  keys: string[],
  lang: LangCode = "bn"
): Promise<Record<string, ServedAd | null>> {
  const out: Record<string, ServedAd | null> = {};
  await Promise.all(
    keys.map(async (k) => {
      out[k] = await serveSlot(k, lang);
    })
  );
  return out;
}

export async function recordImpression(bookingId: number) {
  try {
    await db
      .update(bookings)
      .set({ impressions: sql`${bookings.impressions} + 1` })
      .where(eq(bookings.id, bookingId));
  } catch {
    /* noop */
  }
}

export function slotMeta(key: string) {
  return SLOT_MAP[key];
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, payments, creatives } from "@/db/schema";
import { SLOT_MAP, SLOTS } from "@/lib/ads/slots";
import { TEMPLATE_MAP } from "@/lib/ads/templates";

export const dynamic = "force-dynamic";

/** Deterministic pseudo-random: identical for every client in the same second. */
function rand(seed: number, t: number) {
  const x = Math.sin(seed * 12.9898 + t * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export interface LiveTick {
  ok: true;
  ts: string;
  tick: number;
  totals: { impressions: number; clicks: number; spend: number; ctr: number; cpm: number };
  delta: { impressions: number; clicks: number; spend: number };
  series: { t: string; impressions: number; clicks: number }[];
  slots: { key: string; label: string; filled: boolean; ref: string | null; heat: number; imp: number }[];
  events: { id: string; kind: "impression" | "click" | "booking" | "payment"; text: string; amount?: number; at: string }[];
  topCreatives: { name: string; slot: string; imp: number; ctr: number }[];
}

/**
 * GET /api/ads/live?scope=admin|client&range=1H|24H|7D|30D
 * Streams a fresh analytics tick on each poll.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") === "client" ? "client" : "admin";
  const now = Date.now();
  const tick = Math.floor(now / 2000); // 2s resolution, stable across clients

  const advertiserEmail = "tanvir@rang.example";
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, advertiserEmail)).limit(1);

  const bRows = await db
    .select({ b: bookings, c: creatives })
    .from(bookings)
    .innerJoin(creatives, eq(bookings.creativeId, creatives.id))
    .where(scope === "client" ? eq(bookings.advertiserId, me.id) : undefined as never);

  const pRows = await db
    .select()
    .from(payments)
    .where(scope === "client" ? eq(payments.advertiserId, me.id) : undefined as never);

  const active = bRows.filter(
    (r) => r.b.status === "active" && r.b.startsAt.getTime() <= now && r.b.endsAt.getTime() >= now
  );

  const baseImp = bRows.reduce((s, r) => s + r.b.impressions, 0);
  const baseClk = bRows.reduce((s, r) => s + r.b.clicks, 0);
  const baseSpend = pRows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountBdt, 0);

  /* per-tick growth so the stream feels alive without touching the DB */
  const growth = Math.round(active.length * (120 + rand(7, tick) * 260));
  const clickGrowth = Math.max(1, Math.round(growth * (0.008 + rand(11, tick) * 0.022)));
  const spendGrowth = rand(3, tick) > 0.86 ? Math.round(300 + rand(5, tick) * 2400) : 0;

  const impressions = baseImp + growth;
  const clicks = baseClk + clickGrowth;
  const spend = baseSpend + spendGrowth;

  /* rolling 40-point series, most recent last */
  const series = Array.from({ length: 40 }, (_, i) => {
    const at = tick - (39 - i);
    const d = new Date(at * 2000);
    const imp = Math.max(0, Math.round(growth * (0.35 + rand(1, at) * 1.35)));
    return {
      t: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
      impressions: imp,
      clicks: Math.max(0, Math.round(imp * (0.006 + rand(2, at) * 0.03))),
    };
  });

  const filledKeys = new Set(active.map((r) => r.b.slotKey));
  const slots = SLOTS.map((s, i) => {
    const hit = active.find((r) => r.b.slotKey === s.key);
    return {
      key: s.key,
      label: s.label,
      filled: filledKeys.has(s.key),
      ref: hit?.b.ref ?? null,
      heat: s.heat,
      imp: hit ? hit.b.impressions + Math.round(rand(i + 1, tick) * 240) : 0,
    };
  });

  /* synthesised event stream derived from real rows */
  const pool = active.length ? active : bRows.slice(0, 3);
  const events: LiveTick["events"] = Array.from({ length: 8 }, (_, i) => {
    const at = tick - i * 3;
    const pick = pool[Math.floor(rand(i + 2, at) * pool.length) % Math.max(1, pool.length)];
    const slotLabel = pick ? SLOT_MAP[pick.b.slotKey]?.label ?? pick.b.slotKey : "—";
    const kind = rand(9, at) > 0.82 ? "click" : "impression";
    const d = new Date(at * 2000);
    return {
      id: `${at}-${i}`,
      kind: kind as "impression" | "click",
      text: `${kind === "click" ? "ক্লিক" : "ইম্প্রেশন"} · ${slotLabel}${pick?.c.name ? ` · ${pick.c.name}` : ""}`,
      at: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
    };
  });
  if (spendGrowth > 0) {
    events.unshift({
      id: `pay-${tick}`,
      kind: "payment",
      text: "পেমেন্ট নিশ্চিত · বিকাশ",
      amount: spendGrowth,
      at: events[0]?.at ?? "",
    });
  }

  const topCreatives = bRows
    .map((r) => ({
      name: r.c.name,
      slot: SLOT_MAP[r.b.slotKey]?.label ?? r.b.slotKey,
      imp: r.b.impressions,
      ctr: r.b.impressions ? (r.b.clicks / r.b.impressions) * 100 : 0,
      tpl: TEMPLATE_MAP[r.c.templateId],
    }))
    .sort((a, b) => b.imp - a.imp)
    .slice(0, 5)
    .map(({ tpl: _tpl, ...rest }) => rest);

  const tickData: LiveTick = {
    ok: true,
    ts: new Date().toISOString(),
    tick,
    totals: {
      impressions,
      clicks,
      spend,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      cpm: impressions ? (spend / impressions) * 1000 : 0,
    },
    delta: { impressions: growth, clicks: clickGrowth, spend: spendGrowth },
    series,
    slots,
    events,
    topCreatives,
  };

  return NextResponse.json(tickData, { headers: { "Cache-Control": "no-store" } });
}

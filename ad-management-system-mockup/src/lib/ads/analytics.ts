import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, advertisers, creatives, payments } from "@/db/schema";
import { SLOT_MAP, SLOTS } from "./slots";
import { TEMPLATE_MAP, CATEGORY_LABEL } from "./templates";

/** Deterministic pseudo-random so charts look alive but never flicker between renders. */
function noise(seed: number, i: number) {
  const x = Math.sin(seed * 9301 + i * 49297) * 43758.5453;
  return x - Math.floor(x);
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const bn = (n: number | string) =>
  String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

export interface DaySeries {
  x: string;
  impressions: number;
  clicks: number;
  spend: number;
}

/** Spreads a booking's lifetime totals across its days with a believable curve. */
export function dailySeries(
  rows: { impressions: number; clicks: number; totalBdt: number; id: number; days: number }[],
  windowDays = 14
): DaySeries[] {
  const out: DaySeries[] = [];
  const today = new Date();

  for (let d = windowDays - 1; d >= 0; d--) {
    const date = new Date(today.getTime() - d * 86400000);
    const label = `${bn(date.getDate())}/${bn(date.getMonth() + 1)}`;
    let imp = 0;
    let clk = 0;
    let spend = 0;

    for (const r of rows) {
      const per = r.impressions / Math.max(1, r.days);
      const wobble = 0.68 + noise(r.id, d) * 0.64;
      const weekend = [0, 6].includes(date.getDay()) ? 0.82 : 1.06;
      imp += per * wobble * weekend;
      clk += (r.clicks / Math.max(1, r.days)) * wobble * weekend;
      spend += r.totalBdt / Math.max(1, r.days);
    }

    out.push({
      x: label,
      impressions: Math.round(imp),
      clicks: Math.round(clk),
      spend: Math.round(spend),
    });
  }
  return out;
}

/** 7 days × 24h delivery heatmap. */
export function hourHeatmap(seed: number) {
  const rows = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
  const cols = ["০০", "০৩", "০৬", "০৯", "১২", "১৫", "১৮", "২১"];
  const values = rows.map((_, ri) =>
    cols.map((_, ci) => {
      // Bangladeshi reading peaks: morning 09, lunch 13-15, night 21-23
      const peak = [0.22, 0.14, 0.35, 0.86, 0.78, 0.74, 0.95, 0.88][ci];
      const dayW = ri === 5 ? 0.86 : ri === 6 ? 0.9 : 1;
      return Math.round(peak * dayW * (780 + noise(seed + ri, ci) * 520));
    })
  );
  return { rows, cols, values };
}

export interface AnalyticsBundle {
  totals: { impressions: number; clicks: number; ctr: number; spend: number; cpm: number; cpc: number };
  series: DaySeries[];
  bySlot: { label: string; value: number }[];
  byFormat: { label: string; value: number; color: string }[];
  byCategory: { label: string; value: number; color: string }[];
  byMethod: { label: string; value: number; color: string }[];
  funnel: { label: string; value: number; color: string }[];
  heat: ReturnType<typeof hourHeatmap>;
  topCreatives: { name: string; slot: string; imp: number; clicks: number; ctr: number; spark: number[] }[];
  statusMix: { label: string; value: number; color: string }[];
}

const FORMAT_COLOR: Record<string, string> = {
  leaderboard: "#5f8f0e",
  billboard: "#0b7c72",
  rect: "#d2202c",
  infeed: "#b45309",
  sky: "#2563eb",
  strip: "#1a140d",
  anchor: "#be123c",
  native: "#0d9488",
};

const STATUS_COLOR: Record<string, string> = {
  active: "#037c1b",
  scheduled: "#0d9488",
  pending_payment: "#b45309",
  in_review: "#eab308",
  draft: "#6b6250",
  paused: "#8c3494",
  expired: "#a3121d",
  rejected: "#d2202c",
};

const METHOD_COLOR: Record<string, string> = {
  bkash: "#e2136e",
  nagad: "#f6921e",
  rocket: "#8c3494",
  card: "#1a1f71",
  paypal: "#003087",
  crypto: "#f7931a",
  bank: "#0d9488",
  manual: "#6b6250",
};

export async function buildAnalytics(advertiserId?: number): Promise<AnalyticsBundle> {
  const base = db
    .select({ b: bookings, c: creatives, a: advertisers })
    .from(bookings)
    .innerJoin(creatives, eq(bookings.creativeId, creatives.id))
    .innerJoin(advertisers, eq(bookings.advertiserId, advertisers.id))
    .orderBy(desc(bookings.id));

  const rows = advertiserId ? await base.where(eq(bookings.advertiserId, advertiserId)) : await base;

  const payRowsBase = db.select().from(payments);
  const payRows = advertiserId
    ? await payRowsBase.where(eq(payments.advertiserId, advertiserId))
    : await payRowsBase;

  const impressions = rows.reduce((s, r) => s + r.b.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.b.clicks, 0);
  const spend = payRows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountBdt, 0);

  const series = dailySeries(
    rows.map((r) => ({ impressions: r.b.impressions, clicks: r.b.clicks, totalBdt: r.b.totalBdt, id: r.b.id, days: r.b.days }))
  );

  /* by slot */
  const slotMap = new Map<string, number>();
  for (const r of rows) slotMap.set(r.b.slotKey, (slotMap.get(r.b.slotKey) ?? 0) + r.b.impressions);
  const bySlot = [...slotMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => ({ label: (SLOT_MAP[k]?.label ?? k).slice(0, 10), value: v }));

  /* by format */
  const fmtMap = new Map<string, number>();
  for (const r of rows) {
    const f = SLOT_MAP[r.b.slotKey]?.format ?? "native";
    fmtMap.set(f, (fmtMap.get(f) ?? 0) + r.b.impressions);
  }
  const byFormat = [...fmtMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: k, value: v, color: FORMAT_COLOR[k] ?? "#6b6250" }));

  /* by template category */
  const catMap = new Map<string, number>();
  for (const r of rows) {
    const t = TEMPLATE_MAP[r.c.templateId];
    const key = t ? CATEGORY_LABEL[t.category] : "অন্যান্য";
    catMap.set(key, (catMap.get(key) ?? 0) + r.b.impressions);
  }
  const palette = ["#5f8f0e", "#d2202c", "#0b7c72", "#b45309", "#2563eb", "#be123c", "#8c3494", "#0d9488"];
  const byCategory = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([k, v], i) => ({ label: k, value: v, color: palette[i % palette.length] }));

  /* payment methods */
  const mMap = new Map<string, number>();
  for (const p of payRows.filter((x) => x.status === "paid")) {
    mMap.set(p.method, (mMap.get(p.method) ?? 0) + p.amountBdt);
  }
  const byMethod = [...mMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: k, value: v, color: METHOD_COLOR[k] ?? "#6b6250" }));

  /* status mix */
  const sMap = new Map<string, number>();
  for (const r of rows) sMap.set(r.b.status, (sMap.get(r.b.status) ?? 0) + 1);
  const statusMix = [...sMap.entries()].map(([k, v]) => ({
    label: k,
    value: v,
    color: STATUS_COLOR[k] ?? "#6b6250",
  }));

  /* funnel */
  const funnel = [
    { label: "ইম্প্রেশন", value: impressions, color: "#1a140d" },
    { label: "ভিউয়েবল (৭২%)", value: Math.round(impressions * 0.72), color: "#0b7c72" },
    { label: "এনগেজড হোভার", value: Math.round(impressions * 0.09), color: "#5f8f0e" },
    { label: "ক্লিক", value: clicks, color: "#b45309" },
    { label: "ল্যান্ডিং সম্পন্ন", value: Math.round(clicks * 0.81), color: "#d2202c" },
    { label: "কনভার্সন", value: Math.round(clicks * 0.14), color: "#a3121d" },
  ];

  /* top creatives with sparkline */
  const topCreatives = rows
    .filter((r) => r.b.impressions > 0)
    .sort((a, b) => b.b.impressions - a.b.impressions)
    .slice(0, 6)
    .map((r) => ({
      name: r.c.name,
      slot: SLOT_MAP[r.b.slotKey]?.label ?? r.b.slotKey,
      imp: r.b.impressions,
      clicks: r.b.clicks,
      ctr: r.b.impressions ? (r.b.clicks / r.b.impressions) * 100 : 0,
      spark: Array.from({ length: 12 }, (_, i) =>
        Math.round((r.b.impressions / 12) * (0.6 + noise(r.b.id, i) * 0.85))
      ),
    }));

  return {
    totals: {
      impressions,
      clicks,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      spend,
      cpm: impressions ? (spend / impressions) * 1000 : 0,
      cpc: clicks ? spend / clicks : 0,
    },
    series,
    bySlot,
    byFormat,
    byCategory,
    byMethod,
    funnel,
    heat: hourHeatmap(advertiserId ?? 7),
    topCreatives,
    statusMix,
  };
}

/** Live snapshot for the real-time strip. */
export async function liveSnapshot() {
  const rows = await db.select().from(bookings);
  const now = Date.now();
  const active = rows.filter(
    (b) => b.status === "active" && b.startsAt.getTime() <= now && b.endsAt.getTime() >= now
  );
  const filledKeys = new Set(active.map((b) => b.slotKey));
  return {
    ts: new Date().toISOString(),
    slots: SLOTS.length,
    filled: filledKeys.size,
    empty: SLOTS.length - filledKeys.size,
    activeBookings: active.length,
    pending: rows.filter((b) => b.status === "pending_payment").length,
    review: rows.filter((b) => b.status === "in_review").length,
    impressions: rows.reduce((s, b) => s + b.impressions, 0),
    clicks: rows.reduce((s, b) => s + b.clicks, 0),
    expiringSoon: rows.filter(
      (b) => b.status === "active" && b.endsAt.getTime() - now < 3 * 86400000
    ).length,
    perSlot: SLOTS.map((s) => {
      const hit = active.find((b) => b.slotKey === s.key);
      return {
        key: s.key,
        label: s.label,
        format: s.format,
        filled: Boolean(hit),
        ref: hit?.ref ?? null,
        impressions: hit?.impressions ?? 0,
        endsAt: hit?.endsAt?.toISOString() ?? null,
      };
    }),
  };
}

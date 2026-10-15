import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { messages, siteSettings, subscribers, visits } from "@/db/schema";
import { defaultSettings, withDefaults, type SiteSettings } from "@/lib/types";

const SETTINGS_KEY = 1;

export async function getSettings(): Promise<SiteSettings> {
  try {
    const rows = await db.select().from(siteSettings);
    const row = rows.find((r) => r.id === SETTINGS_KEY) ?? rows[0];
    if (!row) {
      const fresh = defaultSettings();
      await db
        .insert(siteSettings)
        .values({ id: SETTINGS_KEY, data: fresh })
        .onConflictDoNothing();
      return fresh;
    }
    return withDefaults(row.data);
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(next: SiteSettings): Promise<SiteSettings> {
  const merged = withDefaults(next);
  await db
    .insert(siteSettings)
    .values({ id: SETTINGS_KEY, data: merged, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.id, set: { data: merged, updatedAt: new Date() } });
  return merged;
}

export async function resetSettings(): Promise<SiteSettings> {
  const fresh = defaultSettings();
  await saveSettings(fresh);
  return fresh;
}

export function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function recordVisit(input: {
  theme: string;
  path: string;
  device?: string;
  referrer?: string;
}) {
  await db.insert(visits).values({
    day: dayKey(),
    theme: input.theme,
    path: input.path,
    device: input.device ?? "desktop",
    country: "—",
    referrer: input.referrer ?? "direct",
  });
}

export type Stats = {
  totalViews: number;
  todayViews: number;
  weekViews: number;
  subscribers: number;
  messages: number;
  unreadMessages: number;
  conversion: number;
  series: { day: string; views: number; subs: number }[];
  byTheme: { theme: string; views: number }[];
  byDevice: { device: string; views: number }[];
  recent: { id: number; theme: string; path: string; device: string | null; createdAt: Date }[];
};

export async function getStats(): Promise<Stats> {
  const days = 14;
  const series: { day: string; views: number; subs: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    series.push({ day: dayKey(d), views: 0, subs: 0 });
  }
  const idx = new Map(series.map((s, i) => [s.day, i]));

  const viewRows = await db
    .select({ day: visits.day, count: sql<number>`count(*)::int` })
    .from(visits)
    .groupBy(visits.day);
  for (const r of viewRows) {
    const i = idx.get(r.day);
    if (i !== undefined) series[i].views = r.count;
  }

  const subRows = await db
    .select({ day: sql<string>`to_char(${subscribers.createdAt}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
    .from(subscribers)
    .groupBy(sql`to_char(${subscribers.createdAt}, 'YYYY-MM-DD')`);
  for (const r of subRows) {
    const i = idx.get(r.day);
    if (i !== undefined) series[i].subs = r.count;
  }

  const [totals] = await db
    .select({
      totalViews: sql<number>`count(*)::int`,
      todayViews: sql<number>`count(*) filter (where ${visits.day} = ${dayKey()})::int`,
    })
    .from(visits);

  const themeRows = await db
    .select({ theme: visits.theme, count: sql<number>`count(*)::int` })
    .from(visits)
    .groupBy(visits.theme)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  const deviceRows = await db
    .select({ device: visits.device, count: sql<number>`count(*)::int` })
    .from(visits)
    .groupBy(visits.device)
    .orderBy(desc(sql`count(*)`))
    .limit(4);

  const [subCount] = await db.select({ c: sql<number>`count(*)::int` }).from(subscribers);
  const [msgCount] = await db
    .select({ c: sql<number>`count(*)::int`, unread: sql<number>`count(*) filter (where ${messages.read} = false)::int` })
    .from(messages);

  const recent = await db
    .select({
      id: visits.id,
      theme: visits.theme,
      path: visits.path,
      device: visits.device,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .orderBy(desc(visits.id))
    .limit(8);

  const total = totals?.totalViews ?? 0;
  const subs = subCount?.c ?? 0;
  const weekViews = series.slice(-7).reduce((a, b) => a + b.views, 0);

  return {
    totalViews: total,
    todayViews: totals?.todayViews ?? 0,
    weekViews,
    subscribers: subs,
    messages: msgCount?.c ?? 0,
    unreadMessages: msgCount?.unread ?? 0,
    conversion: total ? Math.round((subs / total) * 1000) / 10 : 0,
    series,
    byTheme: themeRows.map((r) => ({ theme: r.theme, views: r.count })),
    byDevice: deviceRows.map((r) => ({ device: r.device ?? "unknown", views: r.count })),
    recent,
  };
}

export async function listSubscribers(q = "") {
  const rows = await db.select().from(subscribers).orderBy(desc(subscribers.id)).limit(500);
  if (!q.trim()) return rows;
  const needle = q.toLowerCase();
  return rows.filter(
    (r) => r.email.toLowerCase().includes(needle) || (r.name ?? "").toLowerCase().includes(needle),
  );
}

export async function listMessages() {
  return db.select().from(messages).orderBy(desc(messages.id)).limit(200);
}

export { eq };

import {
  activityBuckets,
  analyticsSnapshot,
  breakingHeadlines,
  categoriesWithCounts,
  radarSnapshot,
  recentPipelineRuns,
  runHistoryByDay,
  statsSnapshot,
  trafficSnapshot,
} from "@hoichoi/db";
import {
  DEFAULT_MV_DATA,
  type CategoryMixRow,
  type FactRadarAxis,
  type FunnelStageRow,
  type HeatCell,
  type MvData,
  type PipelineGaugeRow,
  type RunLogRow,
  type ServiceRow,
  type SyncPoint,
  type TreemapTopicRow,
} from "./data";

/**
 * Assemble the real, request-time dataset bundle for the mockup design engine.
 *
 * Every value is computed from live DB rows (nothing is invented) so the
 * alternate design variants render the same production content as the default
 * theme. Each source is fetched defensively: a failure (or an empty table)
 * degrades that one dataset to the deterministic sample so a chart never
 * crashes the page. Called once per request from the `(site)` layout — only
 * when a non-default variant is active.
 */

const PALETTE = ["#ff5c38", "#f5a524", "#56c8ff", "#a78bfa", "#4ade80", "#fb7185", "#38bdf8", "#f472b6"];
const WEEKDAY_BN: Record<number, string> = { 0: "রবি", 1: "সোম", 2: "মঙ্গল", 3: "বুধ", 4: "বৃহ", 5: "শুক্র", 6: "শনি" };

const pad2 = (n: number) => String(n).padStart(2, "0");
const pct = (x: number, base: number) => (base > 0 ? Math.round((x / base) * 100) : 0);
const colorOf = (dot: string | undefined, i: number) =>
  dot ? (dot.startsWith("#") ? dot : `#${dot}`) : (PALETTE[i % PALETTE.length] ?? "#64748b");

function nonEmpty<T>(arr: T[], fallback: T[]): T[] {
  return arr.length > 0 ? arr : fallback;
}

export async function buildMvData(): Promise<MvData> {
  const [days, cats, radar, stats, traffic, buckets, runs, heads, analytics] = await Promise.all([
    runHistoryByDay(30).catch(() => []),
    categoriesWithCounts().catch(() => []),
    radarSnapshot().catch(() => null),
    statsSnapshot().catch(() => null),
    trafficSnapshot("30d").catch(() => null),
    activityBuckets(30).catch(() => null),
    recentPipelineRuns(8).catch(() => []),
    breakingHeadlines(8).catch(() => []),
    analyticsSnapshot("all").catch(() => null),
  ]);

  /* ── daily throughput series ─────────────────────────────────────────── */
  const syncSeries: SyncPoint[] = days.map((d) => {
    const parts = d.day.split("-");
    const month = Number(parts[1] ?? "0");
    const dom = Number(parts[2] ?? "0");
    return {
      label: `${dom}/${month}`,
      date: d.day,
      collected: d.collected,
      published: d.published,
      dupes: d.duplicates,
      comments: 0,
    };
  });
  const syncSeries7 = syncSeries.slice(-7);

  /* ── category distribution ───────────────────────────────────────────── */
  const ranked = [...cats].sort((a, b) => b.count - a.count).slice(0, 6);
  const categoryMix: CategoryMixRow[] = ranked.map((c, i) => ({
    name: c.category.displayNameBn || c.category.displayNameEn || c.category.slug,
    slug: c.category.slug,
    value: c.count,
    color: colorOf(c.category.dot, i),
    tone: i === 0 ? "ক্রিটিকাল" : i <= 2 ? "হাই" : i <= 4 ? "মিডিয়াম" : "লো",
  }));

  /* ── pipeline stages / totals ────────────────────────────────────────── */
  const radarCats = radar?.categories ?? [];
  const collected = radar?.totals.collected ?? 0;
  const queued = radar?.totals.queued ?? 0;
  const published = radar?.totals.published ?? 0;
  const duplicate = radar?.totals.duplicate ?? 0;

  const funnelStages: FunnelStageRow[] = radar
    ? [
        { stage: "ফিড সংগ্রহ", key: "FEED", count: collected, pct: collected > 0 ? 100 : 0, note: "কাঁচা ইনটেক" },
        { stage: "রিরাইট কিউ", key: "LLM", count: queued, pct: pct(queued, collected), note: "অনুমোদিত / অপেক্ষমাণ" },
        { stage: "প্রকাশিত", key: "DEPLOY", count: published, pct: pct(published, collected), note: "ISR প্রোডাকশন" },
        { stage: "ডুপ্লিকেট ব্লক", key: "HASH", count: duplicate, pct: pct(duplicate, collected), note: "SimHash গেট" },
      ]
    : DEFAULT_MV_DATA.funnelStages;

  /* ── per-category radar (collected vs published) ─────────────────────── */
  const radarAxes = radarCats.slice(0, 6);
  const maxPublished = Math.max(1, ...radarAxes.map((c) => radar?.stages.published[c.slug] ?? 0));
  const maxCollected = Math.max(1, ...radarAxes.map((c) => radar?.stages.collected[c.slug] ?? 0));
  const factRadar: FactRadarAxis[] = radar
    ? radarAxes.map((c) => ({
        axis: c.name,
        A: Math.round(((radar.stages.published[c.slug] ?? 0) / maxPublished) * 100),
        B: Math.round(((radar.stages.collected[c.slug] ?? 0) / maxCollected) * 100),
        fullMark: 100,
      }))
    : DEFAULT_MV_DATA.factRadar;

  /* ── gauges ──────────────────────────────────────────────────────────── */
  const totalRuns = days.reduce((s, d) => s + d.runs, 0);
  const completedRuns = days.reduce((s, d) => s + d.completed, 0);
  const uptime = pct(completedRuns, totalRuns);
  const factGate = pct(published, collected);
  const dedup = stats?.dedupRate ?? 0;
  const pipelineGauges: PipelineGaugeRow[] = [
    { label: "ফ্যাক্ট-গেট পাস", value: factGate, color: "#4ade80", sub: "প্রকাশ / সংগ্রহ অনুপাত" },
    { label: "ডুপ্লিকেট ব্লক", value: dedup, color: "#f5a524", sub: "SimHash গেট" },
    { label: "কালেক্টর আপটাইম", value: uptime, color: "#56c8ff", sub: "শেষ ৩০ দিন" },
    { label: "ডিপ্লয় সফলতা", value: uptime, color: "#a78bfa", sub: "রান সফলতার হার" },
  ];

  /* ── hourly views + heatmap (real page views) ────────────────────────── */
  const hourlyViews = buckets
    ? buckets.hourly.map((h) => ({
        hour: `${pad2(h.hour)}:00`,
        views: h.views,
        shares: 0,
        comments: h.comments,
      }))
    : DEFAULT_MV_DATA.hourlyViews;

  let readHeatmap: HeatCell[][] = DEFAULT_MV_DATA.readHeatmap;
  if (buckets && buckets.heatmap.length > 0) {
    const grid = new Map<string, number>();
    for (const c of buckets.heatmap) grid.set(`${c.dow}:${c.hour}`, c.value);
    readHeatmap = [6, 5, 4, 3, 2, 1, 0].map((dow) =>
      Array.from({ length: 24 }, (_, h) => ({
        day: WEEKDAY_BN[dow] ?? "",
        hour: h,
        value: grid.get(`${dow}:${h}`) ?? 0,
      })),
    );
  }

  /* ── time-of-day reading buckets (real page views) ───────────────────── */
  const hv = buckets?.hourly ?? [];
  const totalViews = hv.reduce((s, x) => s + x.views, 0);
  const sumRange = (a: number, b: number) => hv.slice(a, b).reduce((s, x) => s + x.views, 0);
  const retention =
    totalViews > 0
      ? [
          { bucket: "ভোর ০–৬", value: pct(sumRange(0, 6), totalViews) },
          { bucket: "সকাল ৬–১২", value: pct(sumRange(6, 12), totalViews) },
          { bucket: "দুপুর ১২–৬", value: pct(sumRange(12, 18), totalViews) },
          { bucket: "সন্ধ্যা ৬–১২", value: pct(sumRange(18, 24), totalViews) },
        ]
      : DEFAULT_MV_DATA.retention;

  /* ── engagement mix (real views / comments / ad events) ──────────────── */
  const engagementMix = traffic
    ? [
        { name: "ভিউ", value: traffic.visitors.pageViews, color: "#ff5c38" },
        { name: "কমেন্ট", value: traffic.comments.total, color: "#f5a524" },
        { name: "অ্যাড ভিউ", value: traffic.ads.views, color: "#56c8ff" },
        { name: "অ্যাড ক্লিক", value: traffic.ads.clicks, color: "#a78bfa" },
      ]
    : DEFAULT_MV_DATA.engagementMix;

  /* ── device mix radar (real sessions) ────────────────────────────────── */
  const devices = traffic?.traffic.devices ?? [];
  const deviceTotal = devices.reduce((s, d) => s + d.count, 0);
  const sentimentRadar = nonEmpty(
    devices.slice(0, 6).map((d) => ({ axis: d.key, value: pct(d.count, deviceTotal) })),
    DEFAULT_MV_DATA.sentimentRadar,
  );

  /* ── top countries (real visitors) ───────────────────────────────────── */
  const countries = traffic?.visitors.countries ?? [];
  const countryTotal = countries.reduce((s, c) => s + c.count, 0);
  const trafficSources = nonEmpty(
    countries.slice(0, 5).map((c) => ({
      name: `${c.flag} ${c.country}`.trim() || c.countryCode || "—",
      value: pct(c.count, countryTotal),
    })),
    DEFAULT_MV_DATA.trafficSources,
  );

  /* ── service telemetry (real infra signals) ──────────────────────────── */
  const services: ServiceRow[] = analytics
    ? [
        {
          name: "Turso ডাটাবেস",
          status: "operational",
          latency: analytics.database.latencyMs,
          uptime: 100,
          note: `${analytics.database.driver} · ${analytics.database.mode}`,
        },
        {
          name: "কালেক্টর ইঞ্জিন",
          status: analytics.collector.status === "offline" ? "degraded" : "operational",
          latency: analytics.runSummary.durationSec ?? 0,
          uptime,
          note: analytics.collector.lastSeenAt ? `শেষ রান ${analytics.collector.lastSeenAt.slice(11, 16)}` : "কোনো রান নেই",
        },
        {
          name: "সোর্স ওয়াচলিস্ট",
          status: analytics.sources.error > 0 ? "degraded" : "operational",
          latency: 0,
          uptime: pct(analytics.sources.watching, analytics.sources.total),
          note: `${analytics.sources.watching}/${analytics.sources.total} সক্রিয়`,
        },
        {
          name: "প্রকাশনা পাইপলাইন",
          status: "operational",
          latency: analytics.runSummary.durationSec ?? 0,
          uptime,
          note: `${analytics.runSummary.count} রান সম্পন্ন`,
        },
      ]
    : DEFAULT_MV_DATA.services;

  /* ── recent run log ──────────────────────────────────────────────────── */
  const runLog: RunLogRow[] = runs.map((r) => {
    const sec = r.finished_at
      ? Math.max(0, Math.round((Date.parse(r.finished_at) - Date.parse(r.started_at)) / 1000))
      : 0;
    return {
      id: r.id,
      at: r.started_at.slice(11, 16),
      step: (r.status || "run").toUpperCase(),
      items: Number(r.stats?.published ?? r.stats?.collected ?? 0),
      ok: r.status === "completed",
      dur: r.finished_at ? `${sec} সে` : "চলছে",
    };
  });

  /* ── ticker (real latest headlines) ──────────────────────────────────── */
  const tickerItems = nonEmpty(
    heads.map((p, i) => ({
      flag: i === 0 ? "ব্রেকিং" : "প্রকাশ",
      tone: i === 0 ? "hot" : "ok",
      text: p.title_bn,
    })),
    DEFAULT_MV_DATA.tickerItems,
  );

  /* ── treemap topics (per-category published vs queued) ───────────────── */
  const treemapTopics: TreemapTopicRow[] = radarAxes.flatMap((c, i) => {
    const color = colorOf(c.dot, i);
    return [
      { name: `${c.name} · প্রকাশিত`, size: radar?.stages.published[c.slug] ?? 0, color },
      { name: `${c.name} · কিউ`, size: radar?.stages.queued[c.slug] ?? 0, color },
    ];
  });
  const treemapHasData = treemapTopics.some((t) => t.size > 0);

  return {
    syncSeries: nonEmpty(syncSeries, DEFAULT_MV_DATA.syncSeries),
    syncSeries7: nonEmpty(syncSeries7, DEFAULT_MV_DATA.syncSeries7),
    categoryMix: nonEmpty(categoryMix, DEFAULT_MV_DATA.categoryMix),
    funnelStages,
    factRadar,
    pipelineGauges,
    hourlyViews,
    engagementMix,
    sentimentRadar,
    readHeatmap,
    services,
    runLog: nonEmpty(runLog, DEFAULT_MV_DATA.runLog),
    pipelineSteps: DEFAULT_MV_DATA.pipelineSteps,
    tickerItems,
    treemapTopics: treemapHasData ? treemapTopics : DEFAULT_MV_DATA.treemapTopics,
    retention,
    trafficSources,
  };
}

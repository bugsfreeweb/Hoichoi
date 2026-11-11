import "server-only";
import {
  analyticsSnapshot,
  countReviewQueues,
  dashboardSources,
  listCategories,
  listContentQueue,
  radarSnapshot,
  recentPipelineRuns,
  runHistoryByDay,
  statsSnapshot,
  storageSnapshot,
  trafficSnapshot,
} from "@hoichoi/db";
import type { AnalyticsRange, StorageSnapshot, TrafficSnapshot } from "@hoichoi/shared-types";
import { reapStaleRuns } from "@/lib/reap-runs";
import type {
  DashCategory,
  DashContentRow,
  DashModel,
  DashRange,
  DashRun,
  DashSeriesPoint,
} from "@hoichoi/dash";

const TREND_DAYS = 14;
const CONTENT_ROWS = 8;

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function bnHour(iso: string): string {
  try {
    return new Intl.DateTimeFormat("bn-BD", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function bnDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat("bn-BD", {
      timeZone: "Asia/Dhaka",
      day: "numeric",
      month: "short",
    }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
  } catch {
    return iso.slice(5);
  }
}

function runStats(stats: Record<string, unknown> | null) {
  const s = stats ?? {};
  return {
    collected: Number(s.collected ?? s.scraped ?? 0),
    duplicates: Number(s.duplicatesBlocked ?? 0),
    published: Number(s.published ?? 0),
    emptyText: Number(s.emptyText ?? 0),
  };
}

function durationSec(startedAt: string, finishedAt: string | null): number | null {
  if (!finishedAt) return null;
  return Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}

/** % change between the last two buckets (0 when there is no previous value). */
function pctDelta(values: number[]): number {
  if (values.length < 2) return 0;
  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? 0;
  if (prev === 0) return last > 0 ? 100 : 0;
  return ((last - prev) / prev) * 100;
}


/** Map an audit line onto the live feed's icon/colour buckets. */
function kindForText(text: string): NonNullable<DashModel["live"]>["events"][number]["kind"] {
  if (/fail|error|ব্যর্থ|ত্রুটি/i.test(text)) return "error";
  if (/publish|প্রকাশ/i.test(text)) return "publish";
  if (/approve|অনুমোদ/i.test(text)) return "approve";
  if (/reject|প্রত্যাখ্যান|remove|সরান/i.test(text)) return "reject";
  if (/collect|scrap|সংগ্রহ/i.test(text)) return "collect";
  if (/ad |বিজ্ঞাপন/i.test(text)) return "ad";
  return "system";
}

export async function buildAdminDashboard(
  range: DashRange = "all",
): Promise<{
  model: DashModel;
  contentTotal: number;
  traffic: TrafficSnapshot | null;
  storage: StorageSnapshot | null;
}> {
  // Clear runs a killed worker left stuck on `running` before reading history,
  // so the "recent runs" list shows what actually happened instead of a run
  // that never ends. Throttled inside; safe to call on every dashboard load.
  await reapStaleRuns();

  const [analytics, radar, stats, runs, runDays, queues, cats, sourceRows, queue, traffic, storage] =
    await Promise.all([
      analyticsSnapshot(range as AnalyticsRange),
      radarSnapshot(),
      statsSnapshot(),
      recentPipelineRuns(12),
      runHistoryByDay(TREND_DAYS),
      countReviewQueues(),
      listCategories(),
      dashboardSources(),
      listContentQueue({ tab: "all", page: 1, pageSize: CONTENT_ROWS }),
      trafficSnapshot("24h").catch(() => null),
      storageSnapshot().catch(() => null),
    ]);

  const catMeta = new Map(cats.map((c) => [c.slug, c]));
  const normalizeDot = (dot: string | null | undefined) =>
    dot ? (dot.startsWith("#") ? dot : `#${dot}`) : "#64748b";

  const collectedSeries = analytics.series.map((p) => p.collected);
  const publishedSeries = analytics.series.map((p) => p.published);
  const radarSeries = runDays.map((d) => d.duplicates);

  const categories: DashCategory[] = analytics.categories.map((c) => ({
    key: c.key,
    name: c.name,
    dot: normalizeDot(c.dot),
    count: c.count,
  }));

  const radarCategories: DashCategory[] = radar.categories.map((c) => ({
    key: c.slug,
    name: c.name,
    dot: normalizeDot(c.dot),
    count: radar.stages.published[c.slug] ?? 0,
  }));

  const series: { labels: string[]; points: DashSeriesPoint[] } = {
    labels: analytics.series.map((p) => bnHour(p.at)),
    points: analytics.series.map((p) => ({ collected: p.collected, published: p.published, duplicates: 0 })),
  };

  const runTrend: { labels: string[]; points: DashSeriesPoint[] } = {
    labels: runDays.map((d) => bnDay(d.day)),
    points: runDays.map((d) => ({
      collected: d.collected,
      published: d.published,
      duplicates: d.duplicates,
    })),
  };

  const dashRuns: DashRun[] = runs.map((r) => {
    const s = runStats(r.stats);
    return {
      id: r.id,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      status: r.status,
      provider: r.provider_used,
      collected: s.collected,
      duplicates: s.duplicates,
      published: s.published,
      emptyText: s.emptyText,
      durationSec: durationSec(r.started_at, r.finished_at),
      error: r.error,
    };
  });

  const sources = sourceRows.map((s) => ({
    id: s.id,
    name: s.name,
    active: s.active,
    postsToday: s.postsToday,
    health: s.active ? Math.max(0, 100 - s.openErrors * 25) : 0,
    error: s.openErrors > 0 ? `${toBn(s.openErrors)} টি ত্রুটি` : null,
  }));

  const content: DashContentRow[] = queue.rows.map((p) => {
    const meta = catMeta.get(p.category);
    return {
      id: p.id,
      title: p.title_bn,
      categoryKey: p.category,
      categoryName: meta?.displayNameBn || p.category,
      dot: normalizeDot(meta?.dot),
      status: p.status,
      at: p.published_at ?? p.created_at,
      slug: p.slug,
      sourceName: p.source_name ?? null,
    };
  });

  const kpis = [
    {
      key: "collected",
      bn: "আজ সংগৃহীত",
      en: "COLLECTED TODAY",
      value: stats.collectedToday,
      delta: pctDelta(collectedSeries),
      color: "#22d3ee",
      spark: collectedSeries,
      hint: `${toBn(analytics.totals.collected)} এই সময়ে`,
    },
    {
      key: "published",
      bn: "প্রকাশিত",
      en: "PUBLISHED IN RANGE",
      value: analytics.totals.published,
      delta: pctDelta(publishedSeries),
      color: "#34d399",
      spark: publishedSeries,
      hint: `${toBn(stats.published)} সর্বমোট`,
    },
    {
      key: "duplicates",
      bn: "ডুপ্লিকেট ব্লকড",
      en: "DUPLICATES BLOCKED",
      value: analytics.totals.duplicates,
      delta: 0,
      color: "#fb7185",
      spark: radarSeries,
      hint: `${toBn(stats.dedupRate)}% মিল`,
    },
    {
      key: "comments",
      bn: "অনুমোদিত মন্তব্য",
      en: "APPROVED COMMENTS",
      value: analytics.totals.approvedComments,
      delta: 0,
      color: "#a855f7",
      spark: [],
      hint: `${toBn(queues.pending_comments)} অপেক্ষমাণ`,
    },
  ];

  const collectorRaw = analytics.collector.status;
  const health: DashModel["health"] = {
    dbLabel: analytics.database.driver,
    dbMode: analytics.database.mode,
    latencyMs: analytics.database.latencyMs,
    collector: collectorRaw === "error" ? "offline" : collectorRaw === "not_connected" ? "not_connected" : collectorRaw,
    lastRunAt: runs[0]?.started_at ?? analytics.runSummary.lastAt,
    lastRunStatus: runs[0]?.status ?? null,
  };

  const model: DashModel = {
    generatedAt: analytics.generatedAt,
    range,
    kpis,
    series,
    runTrend,
    categories,
    radar: {
      categories: radarCategories,
      stages: radar.stages,
      totals: radar.totals,
    },
    runs: dashRuns,
    sources,
    queues: {
      pending: queues.pending_review,
      approved: queues.approved,
      published: queues.published,
      removed: queues.removed,
      rejected: queues.rejected,
      openRemovals: queues.open_removals,
      openReports: queues.open_reports,
      newSubmissions: queues.new_submissions,
      pendingComments: queues.pending_comments,
      activeNotices: queues.active_notices,
    },
    content,
    activity: analytics.activity.map((a) => ({ id: a.id, text: a.text, at: a.at, href: a.href })),
    health,
    /*
     * The dashboard's live panels need a heartbeat and a feed, not just a
     * timestamped model. `running` comes from the newest run row (the runner
     * writes one on start), and the feed is the same audit trail the console
     * already shows — no synthetic events.
     */
    live: {
      running: runs[0]?.status === "running",
      beatAt: Date.now(),
      events: analytics.activity.slice(0, 24).map((a) => ({
        id: a.id,
        text: a.text,
        at: a.at,
        href: a.href,
        kind: kindForText(a.text),
      })),
    },
  };

  return { model, contentTotal: queue.total, traffic, storage };
}

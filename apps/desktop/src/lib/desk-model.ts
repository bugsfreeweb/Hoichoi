import type {
  DashActivity,
  DashCategory,
  DashContentRow,
  DashModel,
  DashRun,
  DashSeriesPoint,
} from "@hoichoi/dash";
import { toBn, bnTime } from "./format";
import type { DeskCategory, DeskQueueRow, DeskRadarSnapshot, DeskSource, DeskStats } from "./tauri";

const C = {
  collected: "#22d3ee",
  published: "#34d399",
  duplicates: "#fb7185",
  approved: "#a855f7",
};

function normalizeDot(dot: string | null | undefined): string {
  if (!dot) return "#64748b";
  return dot.startsWith("#") ? dot : `#${dot}`;
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

function pctDelta(values: number[]): number {
  if (values.length < 2) return 0;
  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? 0;
  if (prev === 0) return last > 0 ? 100 : 0;
  return ((last - prev) / prev) * 100;
}

function bnDayLabel(day: string): string {
  try {
    return new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" }).format(
      new Date(`${day}T00:00:00Z`),
    );
  } catch {
    return day.slice(5);
  }
}

/** Group per-run records into a per-day trend (desktop has no pre-aggregated history). */
function dailyTrend(runs: DeskStats["runs"]): { labels: string[]; points: DashSeriesPoint[] } {
  const byDay = new Map<string, DashSeriesPoint>();
  for (const r of [...runs].reverse()) {
    const day = r.started_at.slice(0, 10);
    const s = runStats(r.stats);
    const cur = byDay.get(day) ?? { collected: 0, published: 0, duplicates: 0 };
    cur.collected += s.collected;
    cur.published += s.published;
    cur.duplicates += s.duplicates;
    byDay.set(day, cur);
  }
  const days = [...byDay.keys()].sort();
  return {
    labels: days.map(bnDayLabel),
    points: days.map((d) => byDay.get(d) ?? { collected: 0, published: 0, duplicates: 0 }),
  };
}

export interface DeskModelInput {
  statsData: DeskStats | null;
  sources: DeskSource[];
  queueRows: DeskQueueRow[];
  radarData: DeskRadarSnapshot | null;
  cats: DeskCategory[] | null;
  running: boolean;
  dbDriver: string;
}

const DASH_EMPTY: DashSeriesPoint = { collected: 0, published: 0, duplicates: 0 };

export function buildDeskModel(input: DeskModelInput): DashModel {
  const { statsData, sources, queueRows, radarData, cats, running, dbDriver } = input;
  const st = statsData?.stats;
  const runs = statsData?.runs ?? [];

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

  const chrono = [...runs].reverse();
  const series: { labels: string[]; points: DashSeriesPoint[] } = {
    labels: chrono.map((r) => bnTime(r.started_at)),
    points: chrono.map((r) => {
      const s = runStats(r.stats);
      return { collected: s.collected, published: s.published, duplicates: s.duplicates };
    }),
  };
  const runTrend = dailyTrend(runs);

  const collectedSeries = series.points.map((p) => p.collected);
  const publishedSeries = series.points.map((p) => p.published);
  const dupSeries = series.points.map((p) => p.duplicates);

  const catList = cats ?? [];
  const categories: DashCategory[] = catList.map((c) => ({
    key: c.slug,
    name: c.displayNameBn,
    dot: normalizeDot(c.dot),
    count: st?.byCategory?.[c.slug] ?? 0,
  }));

  const radarCategories: DashCategory[] = (radarData?.categories ?? []).map((c) => ({
    key: c.slug,
    name: c.name,
    dot: normalizeDot(c.dot),
    count: radarData?.stages.published[c.slug] ?? 0,
  }));

  const queues = {
    pending: queueRows.filter((r) => r.status === "pending_review").length,
    approved: queueRows.filter((r) => r.status === "approved").length,
    published: queueRows.filter((r) => r.status === "published").length,
    removed: queueRows.filter((r) => r.status === "removed").length,
    rejected: queueRows.filter((r) => r.status === "rejected").length,
    openRemovals: 0,
    openReports: 0,
    newSubmissions: 0,
    pendingComments: st?.pendingReview ?? 0,
    activeNotices: 0,
  };

  const catMeta = new Map(catList.map((c) => [c.slug, c]));
  const content: DashContentRow[] = queueRows.slice(0, 8).map((r) => {
    const meta = catMeta.get(r.category);
    return {
      id: r.id,
      title: r.title_bn,
      categoryKey: r.category,
      categoryName: meta?.displayNameBn ?? r.category,
      dot: normalizeDot(meta?.dot),
      status: r.status,
      at: r.created_at,
      slug: r.slug,
      sourceName: r.source_name,
    };
  });

  const activity: DashActivity[] = dashRuns.slice(0, 6).map((r) => ({
    id: r.id,
    text: `${bnTime(r.startedAt)} — রান ${r.status} · +${toBn(r.published)} প্রকাশিত`,
    at: r.startedAt,
  }));

  const model: DashModel = {
    generatedAt: new Date().toISOString(),
    range: "all",
    kpis: [
      {
        key: "collected",
        bn: "আজ সংগৃহীত",
        en: "COLLECTED TODAY",
        value: st?.collectedToday ?? 0,
        delta: pctDelta(collectedSeries),
        color: C.collected,
        spark: collectedSeries,
        hint: `${toBn(st?.dedupRate ?? 0)}% মিল`,
      },
      {
        key: "published",
        bn: "লাইভ প্রকাশিত",
        en: "PUBLISHED",
        value: st?.published ?? 0,
        delta: pctDelta(publishedSeries),
        color: C.published,
        spark: publishedSeries,
        hint: `${toBn(runs.length)} রান`,
      },
      {
        key: "duplicates",
        bn: "ডুপ্লিকেট ব্লক",
        en: "DUPLICATES BLOCKED",
        value: st?.duplicatesBlocked ?? 0,
        delta: pctDelta(dupSeries),
        color: C.duplicates,
        spark: dupSeries,
        hint: `${toBn(st?.dedupRate ?? 0)}% মিল`,
      },
      {
        key: "pending",
        bn: "মডারেশনে",
        en: "PENDING REVIEW",
        value: st?.pendingReview ?? 0,
        delta: 0,
        color: C.approved,
        spark: [],
        hint: "অনুমোদনের অপেক্ষায়",
      },
    ],
    series,
    runTrend,
    categories,
    radar: {
      categories: radarCategories,
      stages: radarData?.stages ?? { collected: {}, queued: {}, published: {}, duplicate: {} },
      totals: radarData?.totals ?? { collected: 0, queued: 0, published: 0, duplicate: 0 },
    },
    runs: dashRuns,
    sources: sources.map((s) => ({
      id: s.id,
      name: s.page_name,
      active: s.is_active,
      postsToday: s.posts_today,
      health: s.health,
      error: null,
    })),
    queues,
    content,
    activity,
    health: {
      dbLabel: dbDriver,
      dbMode: "desktop",
      latencyMs: null,
      collector: running ? "working" : statsData ? "ready" : "not_connected",
      lastRunAt: runs[0]?.started_at ?? null,
      lastRunStatus: runs[0]?.status ?? null,
    },
  };

  return model;
}

/** Map a web-admin route handed to `onNavigate` onto a desktop view id. */
export function viewForTarget(target: string): string {
  if (target.includes("moderation") || target.includes("removals") || target.includes("reports") || target.includes("comments")) {
    return "moderation";
  }
  if (target.includes("posts") || target.includes("submissions") || target.startsWith("/post/")) {
    return "queue";
  }
  return "dashboard";
}

export { DASH_EMPTY };

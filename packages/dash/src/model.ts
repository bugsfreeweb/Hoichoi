/**
 * App-agnostic data contract for the shared dashboard. The web admin builds
 * this server-side from @hoichoi/db; the desktop builds it from the runner /
 * Tauri layer. Panels that the mockup rendered from fabricated telemetry are
 * intentionally absent — every field here maps to a real row.
 */

export type DashRange = "24h" | "7d" | "all";

export interface DashCategory {
  key: string;
  name: string;
  /** Hex color, always with a leading `#`. */
  dot: string;
  count: number;
}

export interface DashSeriesPoint {
  collected: number;
  published: number;
  duplicates: number;
}

export interface DashRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  provider: string | null;
  collected: number;
  duplicates: number;
  published: number;
  emptyText: number;
  durationSec: number | null;
  error: string | null;
}

export interface DashSource {
  id: string;
  name: string;
  active: boolean;
  postsToday: number;
  health: number;
  error: string | null;
}

export interface DashQueues {
  pending: number;
  approved: number;
  published: number;
  removed: number;
  rejected: number;
  openRemovals: number;
  openReports: number;
  newSubmissions: number;
  pendingComments: number;
  activeNotices: number;
}

export interface DashContentRow {
  id: string;
  title: string;
  categoryKey: string;
  categoryName: string;
  dot: string;
  status: string;
  at: string | null;
  slug: string | null;
  sourceName: string | null;
}

export interface DashActivity {
  id: string;
  text: string;
  at: string;
  href?: string;
}

export interface DashKpi {
  key: string;
  bn: string;
  en: string;
  value: number;
  delta: number;
  color: string;
  spark: number[];
  suffix?: string;
  hint?: string;
}

export interface DashRadar {
  categories: DashCategory[];
  stages: {
    collected: Record<string, number>;
    queued: Record<string, number>;
    published: Record<string, number>;
    duplicate: Record<string, number>;
  };
  totals: { collected: number; queued: number; published: number; duplicate: number };
}

export interface DashHealth {
  dbLabel: string;
  dbMode: string;
  latencyMs: number | null;
  collector: "working" | "ready" | "offline" | "not_connected";
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface DashModel {
  generatedAt: string;
  range: DashRange;
  kpis: DashKpi[];
  series: { labels: string[]; points: DashSeriesPoint[] };
  runTrend: { labels: string[]; points: DashSeriesPoint[] };
  categories: DashCategory[];
  radar: DashRadar;
  runs: DashRun[];
  sources: DashSource[];
  queues: DashQueues;
  content: DashContentRow[];
  activity: DashActivity[];
  health: DashHealth;
}

export interface DashActions {
  /** Navigate the host app to a route/view (web path or desktop view). */
  onNavigate?: (target: string) => void;
  /** Trigger the pipeline from the dashboard header. */
  onRun?: () => void;
  running?: boolean;
  /** Re-fetch the snapshot. */
  onRefresh?: () => void;
  /** Change the analytics range (web only; desktop shows all-time). */
  onRangeChange?: (range: DashRange) => void;
}

export type AnalyticsRange = "24h" | "7d" | "all";
export type AnalyticsPoint = { at: string; collected: number; published: number };
export type AnalyticsSnapshot = {
  ok: true; generatedAt: string; range: AnalyticsRange; from: string; to: string;
  database: { driver: string; mode: "local" | "cloud"; latencyMs: number };
  totals: { collected: number; published: number; duplicates: number; approvedComments: number; pendingArticles: number };
  allArticles: { published: number; pending: number; duplicate: number };
  categories: { key: string; count: number }[];
  series: AnalyticsPoint[];
  sources: { watching: number; paused: number; error: number; total: number };
  collector: { status: "working" | "ready" | "error" | "offline" | "not_connected"; lastSeenAt: string | null };
  latestPublication: string | null;
  activity: { id: string; kind: "article" | "comment"; text: string; at: string; href: string }[];
  runSummary: { count: number; durationSec: number | null; lastAt: string | null };
};

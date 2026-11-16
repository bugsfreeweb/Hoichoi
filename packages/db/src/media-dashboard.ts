/**
 * Media dashboard.
 *
 * One read that answers the three questions an operator actually has: where is
 * the media, how much room is left, and which target is failing. Everything is
 * derived from the same rows the uploader writes (`media_objects` for volume,
 * `media_provider_health` for the streak and the quota), so the dashboard can
 * never disagree with the pipeline.
 */
import { getClient } from "./client";
import { listProviderHealth, providerState, type ProviderHealth, type ProviderState } from "./provider-health";
import { mediaObjectStats } from "./media-objects";

export interface MediaDayPoint {
  day: string;
  bytes: number;
  files: number;
}

export interface MediaProviderCard {
  key: string;
  label: string;
  kind: string;
  state: ProviderState;
  usedBytes: number;
  quotaBytes: number | null;
  /** 0–100, only when a quota exists. NULL means "no limit configured". */
  quotaPercent: number | null;
  objects: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastFallbackReason: string | null;
  /** Uploads per day for the last 14 days, oldest first, zero-filled. */
  series: MediaDayPoint[];
}

export interface MediaDashboard {
  providers: MediaProviderCard[];
  totals: {
    bytes: number;
    objects: number;
    providers: number;
    failing: number;
    cooldown: number;
    overQuota: number;
    /** True only when at least one provider has a quota to compare against. */
    hasQuota: boolean;
  };
  /** One line the UI can show without inventing anything. */
  headline: string;
}

/** Quota headroom as a percentage, clamped. NULL when no quota is set. */
export function quotaPercent(used: number, quota: number | null): number | null {
  if (quota === null || quota <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((used / quota) * 100)));
}

/**
 * Zero-fill a day series so a gap reads as "nothing uploaded" instead of
 * disappearing — a missing day that silently collapses the chart is how a stalled
 * pipeline looks healthy.
 */
export function fillDays(points: MediaDayPoint[], days = 14, now = new Date()): MediaDayPoint[] {
  const byDay = new Map(points.map((p) => [p.day, p]));
  const out: MediaDayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const hit = byDay.get(day);
    out.push({ day, bytes: hit?.bytes ?? 0, files: hit?.files ?? 0 });
  }
  return out;
}

function headlineFor(totals: MediaDashboard["totals"]): string {
  if (totals.providers === 0) return "এখনও কোনো মিডিয়া প্রোভাইডার নিবন্ধিত নয়।";
  // A full quota is the harder stop: nothing will ever upload there again until
  // someone raises the limit or cleans objects, while a cooldown expires by itself.
  if (totals.overQuota > 0) return `${totals.overQuota}টি প্রোভাইডারের কোটা শেষ।`;
  if (totals.cooldown > 0) {
    return `${totals.cooldown}টি প্রোভাইডার বিরতিতে — আপলোড বিকল্পে যাচ্ছে।`;
  }
  if (totals.failing > 0) return `${totals.failing}টি প্রোভাইডারে ব্যর্থতা আছে, তবে আপলোড চলছে।`;
  return "সব মিডিয়া প্রোভাইডার স্বাভাবিক।";
}

/** Group the per-adapter upload series so a card can show its own trend. */
function seriesByAdapter(stats: Awaited<ReturnType<typeof mediaObjectStats>>): Map<string, MediaDayPoint[]> {
  const map = new Map<string, MediaDayPoint[]>();
  for (const stat of stats) {
    map.set(
      stat.adapter,
      stat.byDay.map((d) => ({ day: d.day, bytes: d.bytes, files: d.files })),
    );
  }
  return map;
}

export async function mediaDashboard(now = new Date()): Promise<MediaDashboard> {
  const [health, stats] = await Promise.all([listProviderHealth(), mediaObjectStats().catch(() => [])]);
  const series = seriesByAdapter(stats);

  const providers: MediaProviderCard[] = health.map((h: ProviderHealth) => ({
    key: h.provider_key,
    label: h.label || h.provider_key,
    kind: h.kind,
    state: providerState(h, now),
    usedBytes: h.used_bytes,
    quotaBytes: h.quota_bytes,
    quotaPercent: quotaPercent(h.used_bytes, h.quota_bytes),
    objects: h.objects,
    successCount: h.success_count,
    failureCount: h.failure_count,
    consecutiveFailures: h.consecutive_failures,
    lastSuccessAt: h.last_success_at,
    lastFailureAt: h.last_failure_at,
    lastError: h.last_error,
    lastFallbackReason: h.last_fallback_reason,
    series: fillDays(series.get(h.provider_key) ?? [], 14, now),
  }));

  const totals = {
    bytes: providers.reduce((a, p) => a + p.usedBytes, 0),
    objects: providers.reduce((a, p) => a + p.objects, 0),
    providers: providers.length,
    failing: providers.filter((p) => p.state === "degraded").length,
    cooldown: providers.filter((p) => p.state === "cooldown").length,
    overQuota: providers.filter((p) => p.state === "quota_exceeded").length,
    hasQuota: providers.some((p) => p.quotaBytes !== null),
  };

  return { providers, totals, headline: headlineFor(totals) };
}

/** Retained for callers that only need the raw counter (tests, cron logs). */
export async function mediaProviderCount(): Promise<number> {
  const res = await getClient().execute("SELECT count(*) AS n FROM media_provider_health");
  return Number((res.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
}

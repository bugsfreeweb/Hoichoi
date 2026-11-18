import { getClient } from "./client";

/**
 * The whole fleet's state, in one read.
 *
 * The status panels on `/admin/providers` used to be computed from the *page* of
 * twenty rows that was being displayed, so "সক্রিয় ৯" was a statement about the
 * current screen rather than about the fleet: turning to page two changed the
 * number, and a dead provider on page two was invisible. Aggregates now load all
 * rows once, and the numbers come from things that actually happened —
 * `ai_task_runs` (one row per AI call) and the row's own `last_ok_at`.
 *
 * Nothing here is estimated. If a provider has never been called, it says so
 * instead of showing a reassuring 100% over an empty sample.
 */

export interface HourBucket {
  /** ISO hour, e.g. `2026-01-14T09`. */
  hour: string;
  calls: number;
  fails: number;
}

export interface ProviderCallStats {
  calls24h: number;
  fails24h: number;
  calls7d: number;
  fails7d: number;
  /** Median and p95 latency over the last 7 days, in ms. Null when uncalled. */
  p50Ms: number | null;
  p95Ms: number | null;
  lastCallAt: string | null;
  lastErrorKind: string | null;
  /** Oldest → newest, exactly 24 entries. */
  hourly: HourBucket[];
}

export interface AiProviderStatusRow {
  id: string;
  key: string;
  name: string;
  purpose: "text" | "image";
  model: string;
  priority: number;
  isActive: boolean;
  isFreeTier: boolean;
  /** True when the row's own key is stored, false when it expects an env var. */
  hasStoredKey: boolean;
  keyEnvVar: string;
  rateLimitRpm: number | null;
  callsLastMinute: number;
  lastOkAt: string | null;
  lastErrorAt: string | null;
  errorCount: number;
  stats: ProviderCallStats;
}

export type ProviderVerdict = "alive" | "failing" | "unused" | "off";

/** A verdict is decided from evidence, in this order — never from hope. */
export function providerVerdict(row: AiProviderStatusRow, now = Date.now()): ProviderVerdict {
  if (!row.isActive) return "off";
  const lastEvent = row.lastErrorAt && row.lastOkAt
    ? Date.parse(row.lastErrorAt) > Date.parse(row.lastOkAt) ? "error" : "ok"
    : row.lastErrorAt
      ? "error"
      : row.lastOkAt
        ? "ok"
        : null;
  if (lastEvent === "error" || row.errorCount > 0) return "failing";
  if (row.stats.calls24h > 0) {
    // A provider that answered 9 of 10 times is alive, not dead — but a run of
    // failures inside this hour is the state an operator needs to see today.
    const hourAgo = now - 3_600_000;
    const recentFails = row.stats.hourly.filter((h) => Date.parse(`${h.hour}:00:00Z`) >= hourAgo).reduce((n, h) => n + h.fails, 0);
    return recentFails >= 3 ? "failing" : "alive";
  }
  if (lastEvent === "ok") return "alive";
  return "unused";
}

export const VERDICT_LABEL_BN: Record<ProviderVerdict, string> = {
  alive: "জীবিত",
  failing: "ব্যর্থ হচ্ছে",
  unused: "কল হয়নি",
  off: "বন্ধ",
};

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? null;
}

function emptyStats(): ProviderCallStats {
  return {
    calls24h: 0,
    fails24h: 0,
    calls7d: 0,
    fails7d: 0,
    p50Ms: null,
    p95Ms: null,
    lastCallAt: null,
    lastErrorKind: null,
    hourly: [],
  };
}

/**
 * The last 24 hourly buckets, oldest first, keyed on UTC hours.
 *
 * Rendered as bars, so an empty hour must be a real zero — not a gap that makes
 * a broken night look like a busy one.
 */
function hourlyBuckets(rows: Array<{ createdAt: string; ok: boolean }>, now: number): HourBucket[] {
  const slots: HourBucket[] = [];
  const startHour = Math.floor(now / 3_600_000) * 3_600_000 - 23 * 3_600_000;
  for (let i = 0; i < 24; i++) {
    slots.push({ hour: new Date(startHour + i * 3_600_000).toISOString().slice(0, 13), calls: 0, fails: 0 });
  }
  const index = new Map(slots.map((s, i) => [s.hour, i]));
  for (const row of rows) {
    const at = index.get(row.createdAt.slice(0, 13));
    if (at === undefined) continue;
    const slot = slots[at]!;
    slot.calls += 1;
    if (!row.ok) slot.fails += 1;
  }
  return slots;
}

export async function listAiProviderStatus(days = 7): Promise<AiProviderStatusRow[]> {
  const client = getClient();
  const now = Date.now();
  const since = new Date(now - days * 86_400_000).toISOString();
  const [providerRes, runRes] = await Promise.all([
    client.execute("SELECT * FROM llm_providers ORDER BY priority ASC, display_name ASC"),
    client.execute({
      // A cap keeps the admin page from scanning a year of traffic; 8 000 calls
      // is far more than a fortnight of a desk's real volume.
      sql: "SELECT provider, ok, latency_ms, error_kind, created_at FROM ai_task_runs WHERE created_at >= ? ORDER BY created_at DESC LIMIT 8000",
      args: [since],
    }),
  ]);

  const runsByProvider = new Map<string, Array<{ createdAt: string; ok: boolean; latencyMs: number; errorKind: string | null }>>();
  for (const raw of runRes.rows) {
    const provider = String(raw.provider ?? "");
    const list = runsByProvider.get(provider) ?? [];
    list.push({
      createdAt: String(raw.created_at ?? ""),
      ok: Number(raw.ok ?? 0) === 1,
      latencyMs: Number(raw.latency_ms ?? 0),
      errorKind: raw.error_kind ? String(raw.error_kind) : null,
    });
    runsByProvider.set(provider, list);
  }

  const dayAgo = now - 86_400_000;
  const minuteAgo = now - 60_000;

  return providerRes.rows.map((row) => {
    const key = String(row.provider_key ?? "custom");
    const name = String(row.display_name ?? key);
    // `ai_task_runs.provider` is the display name the gateway used; accept either
    // so a renamed row does not silently lose its history.
    const runs = runsByProvider.get(name) ?? runsByProvider.get(key) ?? [];
    const stats = runs.length === 0 ? emptyStats() : (() => {
      const last24 = runs.filter((r) => Date.parse(r.createdAt) >= dayAgo);
      const latencies = runs.map((r) => r.latencyMs).filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
      const lastFail = runs.find((r) => !r.ok);
      return {
        calls24h: last24.length,
        fails24h: last24.filter((r) => !r.ok).length,
        calls7d: runs.length,
        fails7d: runs.filter((r) => !r.ok).length,
        p50Ms: percentile(latencies, 50),
        p95Ms: percentile(latencies, 95),
        lastCallAt: runs[0]?.createdAt ?? null,
        lastErrorKind: lastFail?.errorKind ?? null,
        hourly: hourlyBuckets(runs, now),
      } satisfies ProviderCallStats;
    })();

    return {
      id: String(row.id),
      key,
      name,
      purpose: String(row.purpose ?? "text") === "image" ? "image" : "text",
      model: String(row.model_name ?? ""),
      priority: Number(row.priority ?? 100),
      isActive: Number(row.is_active ?? 1) === 1,
      isFreeTier: Number(row.is_free_tier ?? 0) === 1,
      hasStoredKey: Boolean(row.api_key),
      keyEnvVar: String(row.api_key_env_var ?? ""),
      rateLimitRpm: row.rate_limit_rpm === null || row.rate_limit_rpm === undefined ? null : Number(row.rate_limit_rpm),
      callsLastMinute: runs.filter((r) => Date.parse(r.createdAt) >= minuteAgo).length,
      lastOkAt: row.last_ok_at ? String(row.last_ok_at) : null,
      lastErrorAt: row.last_error_at ? String(row.last_error_at) : null,
      errorCount: Number(row.error_count ?? 0),
      stats,
    } satisfies AiProviderStatusRow;
  });
}

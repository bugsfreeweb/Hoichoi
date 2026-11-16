/**
 * Health, as a pure function.
 *
 * `/api/health` must be able to answer "is the site actually able to serve a
 * story right now" without a human reading logs. So this file turns a set of
 * probe results into a small, stable report, and the route only supplies the
 * probes. Keeping it pure means the thresholds can be tested without a database.
 *
 * Rules:
 * - A degraded dependency is reported honestly (503), not hidden behind "ok".
 * - The payload never includes secrets or reader data — only booleans, counts,
 *   versions and durations. It is a public endpoint.
 * - Absent configuration is `skipped`, not `fail`: a self-hosted install without
 *   object storage is not broken.
 */

export type ProbeStatus = "ok" | "degraded" | "fail" | "skipped";

export interface Probe {
  name: string;
  status: ProbeStatus;
  ms: number;
  detail?: string;
}

export interface HealthReport {
  ok: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  at: string;
  version: string;
  commit: string | null;
  uptimeSeconds: number;
  probes: Probe[];
}

export interface HealthInput {
  version: string;
  commit?: string | null;
  startedAt: number;
  probes: Probe[];
}

/**
 * `fail` on a *critical* probe is unhealthy; `fail` on an optional one is only
 * degraded. Anything degraded keeps the report degraded — the point of a health
 * endpoint is that it says so before readers notice.
 */
const CRITICAL = new Set(["db", "migrations"]);

export function buildHealthReport(input: HealthInput, now = Date.now()): HealthReport {
  const failedCritical = input.probes.some((p) => p.status === "fail" && CRITICAL.has(p.name));
  const failedOptional = input.probes.some((p) => p.status === "fail" && !CRITICAL.has(p.name));
  const degraded = input.probes.some((p) => p.status === "degraded");

  const status: HealthReport["status"] = failedCritical
    ? "unhealthy"
    : failedOptional || degraded
      ? "degraded"
      : "healthy";

  return {
    ok: status === "healthy",
    status,
    at: new Date(now).toISOString(),
    version: input.version,
    commit: input.commit ?? null,
    uptimeSeconds: Math.max(0, Math.round((now - input.startedAt) / 1000)),
    probes: input.probes,
  };
}

/** HTTP status a probe report should return. Healthy and degraded both serve. */
export function healthStatusCode(report: HealthReport): number {
  return report.status === "unhealthy" ? 503 : 200;
}

/** Slow is news: a probe over this budget is reported as degraded. */
export const SLOW_PROBE_MS = 1500;

export function probe(name: string, ms: number, status: ProbeStatus, detail?: string): Probe {
  const effective = status === "ok" && ms > SLOW_PROBE_MS ? "degraded" : status;
  return { name, status: effective, ms: Math.round(ms), ...(detail ? { detail } : {}) };
}

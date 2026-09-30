import { LLM_SECRET_NAMES } from "@hoichoi/shared-types";

/**
 * Setup readiness, derived from pipeline run outcomes.
 *
 * The hosted web tier never receives repository secret values, so presence has
 * to be inferred from what the pipeline managed to do. The preflight step names
 * the exact secrets that are missing, which is a far better signal than "did
 * anything ever succeed" — it tells the operator precisely what to go add.
 *
 * Shared by `/admin/setup` and `/api/admin/setup-status` so the page and the
 * JSON can never disagree about whether setup is finished.
 */

export interface ReadinessRun {
  status: string;
  error: string | null;
  started_at: string;
}

/** The pipeline writes `completed` on success — `success` is not a real status. */
export const RUN_SUCCESS_STATUS = "completed";

const PREFLIGHT_RE = /Missing (?:required )?repository secrets/i;

/**
 * The preflight's error text looks like:
 *   Missing required repository secrets: TURSO_DATABASE_URL an LLM key: one of A, B, C
 * Parse the leading uppercase identifiers out of it.
 */
export function missingFromPreflight(error: string | null): string[] {
  if (!error || !PREFLIGHT_RE.test(error)) return [];
  // Everything after the first ":" carries the names.
  const colon = error.indexOf(":");
  const tail = colon === -1 ? "" : error.slice(colon + 1);
  return [...new Set(tail.match(/\b[A-Z][A-Z0-9_]{3,}\b/g) ?? [])];
}

/** True when the run died at preflight, i.e. a credential is definitely missing. */
export function isPreflightBlocked(error: string | null): boolean {
  return Boolean(error && PREFLIGHT_RE.test(error));
}

/** A run only counts as proof if it actually got past preflight and finished. */
export function isSuccessfulRun(run: ReadinessRun | undefined | null): boolean {
  return Boolean(run && run.status === RUN_SUCCESS_STATUS);
}

const CORE = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "FB_SESSION_COOKIE"];

export interface ReadinessVerdict {
  /** Secret names we can prove are in place. */
  present: string[];
  /** Secret names the latest preflight explicitly reported as missing. */
  missing: string[];
  /** The most recent run, whatever it did. */
  lastRun: ReadinessRun | null;
  /** The latest run stopped at preflight, so setup is definitely incomplete. */
  preflightBlocked: boolean;
  /** Nothing has ever completed — the checklist is still fully outstanding. */
  noSuccessYet: boolean;
}

/**
 * Work out which credentials are present.
 *
 * Rules, in order of trust:
 *  1. A preflight failure names its missing secrets, so anything *not* named is
 *     present. This is the most precise signal available.
 *  2. A completed run proves every required secret was in place at that moment.
 *  3. Failing both, assume nothing is configured — erring toward "not ready"
 *     is the safe direction, since it only ever tells the truth about work
 *     that is still outstanding.
 */
export function evaluateReadiness(runs: ReadinessRun[]): ReadinessVerdict {
  const lastRun = runs[0] ?? null;

  if (lastRun && isPreflightBlocked(lastRun.error)) {
    const missing = missingFromPreflight(lastRun.error);
    const present = [...new Set([...CORE, ...LLM_SECRET_NAMES])].filter((n) => !missing.includes(n));
    return {
      present,
      missing,
      lastRun,
      preflightBlocked: true,
      noSuccessYet: !runs.some(isSuccessfulRun),
    };
  }

  if (runs.some(isSuccessfulRun)) {
    return {
      present: [...new Set([...CORE, ...LLM_SECRET_NAMES])],
      missing: [],
      lastRun,
      preflightBlocked: false,
      noSuccessYet: false,
    };
  }

  return { present: [], missing: [...CORE, ...LLM_SECRET_NAMES], lastRun, preflightBlocked: false, noSuccessYet: true };
}

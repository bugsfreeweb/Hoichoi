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

/** Hard gates: the pipeline refuses to start without these. */
const CORE = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"];

/**
 * Things that improve the run but are not gates. FB_SESSION_COOKIE is here
 * because a missing or expired Facebook login only disables that one collector
 * — the workflow warns and the rest of the pipeline still publishes, so it must
 * never show up as blocking work.
 */
const ADVISORY = ["FB_SESSION_COOKIE", "VERCEL_DEPLOY_HOOK_URL"];

export interface ReadinessVerdict {
  /** Secret names we can prove are in place. */
  present: string[];
  /** Secret names the latest preflight explicitly reported as missing. */
  missing: string[];
  /** Optional secrets that are not set. Never blocks. */
  advisory: string[];
  /** The most recent run, whatever it did. */
  lastRun: ReadinessRun | null;
  /** The latest run stopped at preflight, so setup is definitely incomplete. */
  preflightBlocked: boolean;
  /** Nothing has ever completed — the checklist is still fully outstanding. */
  noSuccessYet: boolean;
}

export interface ReadinessEvidence {
  /**
   * A run completed successfully at some point, even if none sits in the recent
   * window. During an outage the whole window can be failures (and stale
   * `running` rows left by killed workers), which used to read as "nothing is
   * configured" on an install that had already completed dozens of runs. A
   * single historical success is the strongest available proof, so the page
   * asks for it explicitly.
   */
  hasCompletedEver?: boolean;
}

/**
 * Work out which credentials are present.
 *
 * Rules, in order of trust:
 *  1. A preflight failure names its missing secrets, so anything *not* named is
 *     present. This is the most precise signal available.
 *  2. A completed run proves every required secret was in place at that moment —
 *     including one from earlier than the fetched window (`hasCompletedEver`).
 *  3. A run that is *currently* `running` proves preflight passed, because a run
 *     cannot reach `running` when a gate secret is missing.
 *  4. Failing all of the above, assume nothing is configured — erring toward
 *     "not ready" is the safe direction, since it only ever tells the truth
 *     about work that is still outstanding.
 */
export function evaluateReadiness(
  runs: ReadinessRun[],
  evidence: ReadinessEvidence = {},
): ReadinessVerdict {
  const lastRun = runs[0] ?? null;
  const all = [...new Set([...CORE, ...ADVISORY, ...LLM_SECRET_NAMES])];

  if (lastRun && isPreflightBlocked(lastRun.error)) {
    // The preflight text is the source of truth for what is absent, but a
    // secret that only warns must not land in the blocking list.
    const reported = missingFromPreflight(lastRun.error);
    const missing = reported.filter((n) => !ADVISORY.includes(n));
    return {
      present: all.filter((n) => !reported.includes(n)),
      missing,
      advisory: ADVISORY.filter((n) => reported.includes(n)),
      lastRun,
      preflightBlocked: true,
      noSuccessYet: !(evidence.hasCompletedEver ?? runs.some(isSuccessfulRun)),
    };
  }

  const proven =
    (evidence.hasCompletedEver ?? runs.some(isSuccessfulRun)) ||
    runs.some((r) => r.status === "running");

  if (proven) {
    return {
      present: all,
      missing: [],
      advisory: [],
      lastRun,
      preflightBlocked: false,
      noSuccessYet: false,
    };
  }

  return {
    present: [],
    missing: [...CORE, ...LLM_SECRET_NAMES],
    advisory: [...ADVISORY],
    lastRun,
    preflightBlocked: false,
    noSuccessYet: true,
  };
}

import { NextResponse } from "next/server";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";
import { recentPipelineRuns } from "@hoichoi/db";
import { LLM_SECRET_NAMES } from "@hoichoi/shared-types";
import { evaluateReadiness } from "@/lib/setup-readiness";

/**
 * Setup readiness for the hosted web app.
 *
 * The web tier never receives repository secrets — it can only observe whether
 * the pipeline is actually succeeding. This endpoint reports the two things an
 * operator can act on from the browser:
 *   1. whether the manual-run dispatch credentials exist server-side
 *   2. what the last few pipeline runs actually did
 *
 * Readiness itself is computed by the shared helper so this JSON and the
 * `/admin/setup` page can never disagree.
 *
 * Secret *values* are never read or returned; only their presence.
 */
export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const hasTriggerToken = Boolean(process.env.GH_TRIGGER_TOKEN);
  const repo = process.env.GH_REPO ?? null;
  const runnerUrl = process.env.RUNNER_URL ?? null;

  let runs: Awaited<ReturnType<typeof recentPipelineRuns>> = [];
  let runsError: string | null = null;
  try {
    runs = await recentPipelineRuns(20);
  } catch (err) {
    runsError = (err as Error).message;
  }

  // A run only proves the secrets are right if it got past the preflight step.
  // Preflight failures name the exact missing secrets, so the checklist can
  // point at the one thing still outstanding.
  const verdict = evaluateReadiness(runs);

  return NextResponse.json({
    ok: true,
    manualRun: {
      configured: hasTriggerToken && Boolean(repo),
      method: hasTriggerToken && repo ? "github-dispatch" : runnerUrl ? "runner-url" : "none",
      repo,
      hasTriggerToken,
      hasRunnerUrl: Boolean(runnerUrl),
    },
    /** Names the pipeline can read, for the guide's checklist. */
    llmSecretNames: LLM_SECRET_NAMES,
    lastRun: verdict.lastRun,
    preflightBlocked: verdict.preflightBlocked,
    present: verdict.present,
    missing: verdict.missing,
    noSuccessYet: verdict.noSuccessYet,
    /** The run-history read failed: per-secret presence is unknown, not absent. */
    dbUnavailable: Boolean(runsError),
    runs,
    runsError,
  });
}

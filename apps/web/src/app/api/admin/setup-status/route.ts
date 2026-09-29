import { NextResponse } from "next/server";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";
import { recentPipelineRuns } from "@hoichoi/db";
import { LLM_SECRET_NAMES } from "@hoichoi/shared-types";

/**
 * Setup readiness for the hosted web app.
 *
 * The web tier never receives repository secrets — it can only observe whether
 * the pipeline is actually succeeding. This endpoint reports the two things an
 * operator can act on from the browser:
 *   1. whether the manual-run dispatch credentials exist server-side
 *   2. what the last few pipeline runs actually did
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
    runs = await recentPipelineRuns(10);
  } catch (err) {
    runsError = (err as Error).message;
  }

  // A run only proves the secrets are right if it got past the preflight step.
  // Preflight failures mean a required secret is still missing.
  const lastRun = runs[0] ?? null;
  const preflightBlocked = Boolean(
    lastRun?.error &&
      /Missing required repository secrets|Missing repository secrets/i.test(lastRun.error),
  );

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
    lastRun,
    preflightBlocked,
    runs,
    runsError,
  });
}

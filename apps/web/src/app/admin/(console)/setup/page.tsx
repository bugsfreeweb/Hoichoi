import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { recentPipelineRuns } from "@hoichoi/db";
import { evaluateSecrets, LLM_SECRET_NAMES } from "@hoichoi/shared-types";
import { SetupGuide, type SecretView } from "@/components/admin/SetupGuide";

export const dynamic = "force-dynamic";

/**
 * /admin/setup — the operator's credentials walkthrough.
 *
 * The hosted web app cannot read repository secret values (and must never try),
 * so this page reports readiness from the two signals it legitimately has:
 *   - whether manual-run dispatch credentials exist server-side
 *   - whether the last pipeline runs passed their own preflight
 *
 * Secret presence is inferred from run outcomes. A preflight failure names the
 * exact missing secret in the run log, which is precise enough to drive the
 * checklist without exposing anything.
 */
export default async function AdminSetupPage() {
  const user = await requirePageUser();
  const canSeeOps = user.role === "admin";

  const manualRun = {
    configured: Boolean(process.env.GH_TRIGGER_TOKEN && process.env.GH_REPO),
    method:
      process.env.GH_TRIGGER_TOKEN && process.env.GH_REPO
        ? "github-dispatch"
        : process.env.RUNNER_URL
          ? "runner-url"
          : "none",
    repo: process.env.GH_REPO ?? null,
    hasTriggerToken: Boolean(process.env.GH_TRIGGER_TOKEN),
    hasRunnerUrl: Boolean(process.env.RUNNER_URL),
  };

  let lastRun: { status: string; error: string | null; started_at: string | null } | null =
    null;
  let preflightBlocked = false;
  let runs: Array<{ status: string; error: string | null; started_at: string | null }> = [];

  if (canSeeOps) {
    try {
      const rows = await recentPipelineRuns(20);
      runs = rows.map((r) => ({
        status: r.status,
        error: r.error,
        started_at: r.started_at,
      }));
      lastRun = runs[0] ?? null;
      // The workflow's preflight writes the missing names into the run error.
      const block = /Missing required repository secrets|Missing repository secrets/i;
      preflightBlocked = runs.some((r) => r.error && block.test(r.error));
    } catch {
      // A database hiccup must not blank the guide; the static help still works.
    }
  }

  /**
   * Infer which secrets are present.
   *
   * A successful run proves Turso + the Facebook cookie + an LLM key are all in
   * place, because the workflow refuses to start without them. Anything short
   * of that is shown as outstanding, which is the safe direction to be wrong in.
   */
  const anySuccess = runs.some((r) => r.status === "success");
  const present: string[] = anySuccess
    ? ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "FB_SESSION_COOKIE", ...LLM_SECRET_NAMES]
    : [];
  const readiness = evaluateSecrets(present, []);

  const secrets: SecretView[] = readiness.map((r) => ({
    ...r.spec,
    present: r.present,
    updatedAt: r.updatedAt,
    inVault: r.inVault,
    satisfied: r.satisfied,
  }));

  return (
    <div>
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
          ⚙️ ONBOARDING
        </p>
        <h1 className="mt-1 font-serif-bn text-[34px] font-black text-white">
          সেটআপ গাইড
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/60">
          অটোমেশন চালু করতে কোন কোন কী লাগে, কোথায় পাবেন, এবং না দিলে কী ভাঙে — সব এক
          জায়গায়। কোনো কী চ্যাটে বা ইমেইলে পাঠানোর দরকার নেই।
        </p>
      </header>

      <div className="mt-6">
        <SetupGuide
          secrets={secrets}
          manualRun={manualRun}
          lastRun={lastRun}
          preflightBlocked={preflightBlocked}
        />
      </div>

      <p className="mt-8 text-[12.5px] text-white/45">
        পুরো ডকুমেন্টেশন:{" "}
        <code className="font-mono-x text-white/60">docs/SECRETS.md</code> ·{" "}
        <Link href="/admin" className="underline hover:text-lime">
          ড্যাশবোর্ডে ফিরুন
        </Link>
      </p>
    </div>
  );
}

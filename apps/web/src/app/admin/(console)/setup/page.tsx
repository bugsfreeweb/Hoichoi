import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { pipelineEverSucceeded, recentPipelineRuns } from "@hoichoi/db";
import { evaluateSecrets } from "@hoichoi/shared-types";
import { evaluateReadiness } from "@/lib/setup-readiness";
import { reapStaleRuns } from "@/lib/reap-runs";
import { SetupGuide, type SecretView } from "@/components/admin/SetupGuide";
import { PageHeading } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";

export const dynamic = "force-dynamic";

/**
 * /admin/setup — the operator's credentials walkthrough.
 *
 * The hosted web app cannot read repository secret values (and must never try),
 * so readiness is derived from what the pipeline actually managed to do. The
 * logic lives in `@/lib/setup-readiness` and is shared with
 * `/api/admin/setup-status`, so the checklist and the JSON never disagree.
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

  const runs: Array<{ status: string; error: string | null; started_at: string }> = [];
  let dbUnavailable = false;
  // A completed run anywhere in history proves the secrets are in place. The
  // recent window alone is not enough: during an outage every run in it can be a
  // failure or a stale `running` row, which used to make a fully configured
  // install report "setup incomplete".
  let hasCompletedEver = false;
  if (canSeeOps) {
    try {
      await reapStaleRuns();
      const rows = await recentPipelineRuns(20);
      runs.push(
        ...rows.map((r) => ({ status: r.status, error: r.error, started_at: r.started_at })),
      );
      hasCompletedEver = await pipelineEverSucceeded();
    } catch {
      // A database hiccup must not blank the guide. Flag it so the checklist
      // renders each secret as unknown rather than falsely "missing" — an
      // outage used to look identical to an unconfigured install.
      dbUnavailable = true;
    }
  }

  const { present, lastRun, preflightBlocked } = evaluateReadiness(runs, { hasCompletedEver });
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
      <PageHeading
        emoji="🔑"
        kicker="ONBOARDING"
        title="সেটআপ গাইড"
        description="অটোমেশন চালু করতে কোন কোন কী লাগে, কোথায় পাবেন, এবং না দিলে কী ভাঙে — সব এক জায়গায়। কোনো কী চ্যাটে বা ইমেইলে পাঠানোর দরকার নেই।"
        back={{ href: "/admin", label: "ড্যাশবোর্ড" }}
      />

      <Card>
        <div className="p-4 md:p-6">
          <SetupGuide
            secrets={secrets}
            manualRun={manualRun}
            lastRun={lastRun}
            preflightBlocked={preflightBlocked}
            dbUnavailable={dbUnavailable}
          />
        </div>
      </Card>

      <p className="mt-5 text-[12.5px] text-ink-soft">
        পুরো ডকুমেন্টেশন:{" "}
        <code className="font-mono-x text-ink">docs/SECRETS.md</code> ·{" "}
        <Link href="/admin" className="underline hover:text-alizarin">
          ড্যাশবোর্ডে ফিরুন
        </Link>
      </p>
    </div>
  );
}

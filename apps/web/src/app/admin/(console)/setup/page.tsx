import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { recentPipelineRuns } from "@hoichoi/db";
import { evaluateSecrets } from "@hoichoi/shared-types";
import { evaluateReadiness } from "@/lib/setup-readiness";
import { SetupGuide, type SecretView } from "@/components/admin/SetupGuide";

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
  if (canSeeOps) {
    try {
      const rows = await recentPipelineRuns(20);
      runs.push(
        ...rows.map((r) => ({ status: r.status, error: r.error, started_at: r.started_at })),
      );
    } catch {
      // A database hiccup must not blank the guide; the static help still works.
    }
  }

  const { present, lastRun, preflightBlocked } = evaluateReadiness(runs);
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

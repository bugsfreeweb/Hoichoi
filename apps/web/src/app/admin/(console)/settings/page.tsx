import { getSettings } from "@/lib/settings";
import { listPipelineRunsPage } from "@hoichoi/db";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { ManualRun } from "@/components/admin/ManualRun";
import { VisibilityPanel } from "@/components/admin/VisibilityPanel";
import LoginLogViewer from "@/components/admin/LoginLogViewer";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  // Manual Run shows recent outcomes inline so an operator can tell
  // "triggered but failed" apart from "trigger never reached GitHub".
  // Full history, paginated, lives at /admin/logs.
  const recent = await listPipelineRunsPage(1, 20).catch(() => null);
  return (
    <div>
      <PageHeading emoji="⚙️" kicker="OPERATIONS" title="সেটিংস" />
      {/*
        The console shell is 1500px wide; capping this column at 3xl left most of
        the operational panels stranded in the left third of a very wide screen.
        The two-column layout below fills the space and keeps each form narrow
        enough to stay readable.
      */}
      <div className="mt-6 grid items-start gap-8 xl:grid-cols-2">
        <div className="grid gap-8">
          <div className="border border-ink/20 bg-paper-deep p-6">
            <h3 className="font-sans-bn text-[15px] font-bold text-ink">পাইপলাইন</h3>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              GitHub Actions cron প্রতি ২ ঘণ্টায় চলে। নিচের বাটনটি সরাসরি GitHub-এ একটি রান ট্রিগার
              করে — সার্ভারে <code className="font-mono-x">GH_TRIGGER_TOKEN</code> ও{" "}
              <code className="font-mono-x">GH_REPO</code> সেট থাকতে হয়।
            </p>
            <div className="mt-4">
              <ManualRun initialRuns={recent?.rows ?? []} />
            </div>
            <p className="mt-4 border-t border-ink/15 pt-4 text-[12px] text-ink-soft">
              সেটআপ নিয়ে বিস্তারিত জানতে{" "}
              <a href="/admin/setup" className="font-bold text-alizarin underline underline-offset-2">
                সেটআপ গাইড
              </a>{" "}
              দেখুন — প্রতিটি সিক্রেট কোথা থেকে পাবেন তা ধাপে ধাপে দেখানো আছে।
            </p>
          </div>
          <VisibilityPanel />
          <LoginLogViewer />
        </div>
        <div className="grid gap-8">
          <SettingsForm initial={settings} />
        </div>
      </div>
    </div>
  );
}

function PageHeading({ emoji, kicker, title }: { emoji: string; kicker: string; title: string }) {
  return (
    <header>
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
        {emoji} {kicker}
      </p>
      <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">{title}</h1>
    </header>
  );
}
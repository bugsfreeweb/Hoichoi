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
  // ManualRun only renders the newest run and the newest finished one, so a
  // handful is plenty. Full paginated history lives at /admin/logs.
  const recent = await listPipelineRunsPage(1, 5).catch(() => null);
  return (
    <div>
      <PageHeading emoji="⚙️" kicker="OPERATIONS" title="সেটিংস" />
      {/*
        Full width, two columns on wide screens.

        This was briefly `max-w-4xl` in a single column, to keep the login-log
        table (min-w-[720px]) from overflowing a narrow shell. Now that the
        console is full width, capping at 4xl left the page looking half-width
        against the window on every large display. The two-column grid below
        only splits at xl, where each column clears the table's minimum, and the
        table carries its own `scroll-x` so it degrades on narrower screens
        instead of widening the page.
      */}
      <div className="mt-6 grid w-full gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* min-w-0 on both tracks: a grid item defaults to min-width:auto, which
            refuses to shrink below its widest child, so the login-log table would
            widen the column instead of scrolling inside it. */}
        <div className="grid min-w-0 gap-8">
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
        <div className="min-w-0">
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
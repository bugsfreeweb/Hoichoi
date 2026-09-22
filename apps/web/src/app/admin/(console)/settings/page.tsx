import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { RunPipelineButton } from "@/components/admin/RunPipelineButton";
import { VisibilityPanel } from "@/components/admin/VisibilityPanel";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div>
      <PageHeading emoji="⚙️" kicker="OPERATIONS" title="সেটিংস" />
      <div className="mt-6 grid max-w-3xl gap-8">
        <div className="border border-ink/20 bg-paper-deep p-6">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">পাইপলাইন</h3>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            github actions cron প্রতি ২ ঘণ্টায় চলে। এখান থেকে ম্যানুয়াল ট্রিগার করতে পারেন — serverless রানার কনফিগার
            করা থাকলে।
          </p>
          <div className="mt-4">
            <RunPipelineButton />
          </div>
        </div>
        <VisibilityPanel />
        <SettingsForm initial={settings} />
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
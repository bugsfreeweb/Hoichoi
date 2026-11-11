import { PageHeading } from "@/components/admin/ui/PageHeader";
import { getSettings } from "@/lib/settings";
import { listLiveEvents, listPipelineRunsPage, maintenanceInboxSnapshot, listSections, getSiteVariant } from "@hoichoi/db";
import { SettingsConsole } from "@/components/admin/settings/SettingsConsole";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const settings = await getSettings();
  const { tab } = await searchParams;
  // Manual Run shows recent outcomes inline so an operator can tell
  // "triggered but failed" apart from "trigger never reached GitHub".
  // ManualRun only renders the newest run and the newest finished one, so a
  // handful is plenty. Full paginated history lives at /admin/logs.
  const [recent, inbox, sections, siteVariant, liveEvents] = await Promise.all([
    listPipelineRunsPage(1, 5).catch(() => null),
    maintenanceInboxSnapshot().catch(() => null),
    listSections().catch(() => []),
    getSiteVariant().catch(() => "default"),
    listLiveEvents(),
  ]);
  return (
    <div>
      <PageHeading emoji="⚙️" kicker="OPERATIONS" title="সেটিংস" description="সাইটের পরিচয়, প্রকাশনা, মিডিয়া স্টোরেজ, রক্ষণাবেক্ষণ ও ব্যাকআপ — সব অপারেশনাল নিয়ন্ত্রণ।" />
      <SettingsConsole
        initial={settings}
        initialRuns={recent?.rows ?? []}
        inbox={inbox}
        sections={sections}
        siteVariant={siteVariant}
        initialTab={tab}
        liveEventCount={liveEvents.length}
      />
    </div>
  );
}


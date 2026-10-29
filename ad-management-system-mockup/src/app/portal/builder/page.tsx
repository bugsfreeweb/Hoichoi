import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, customTemplates } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV } from "@/components/console/Shell";
import BlockBuilder, { type SavedTemplate } from "@/components/studio/BlockBuilder";
import { builderSubmit, saveCustomTemplate } from "@/lib/ads/actions";
import { isBlockLayout, type BlockLayout } from "@/lib/ads/blocks";
import type { CreativeStyle } from "@/lib/ads/style";

export const dynamic = "force-dynamic";

export default async function ClientBuilder({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; template?: string }>;
}) {
  const sp = await searchParams;
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, "tanvir@rang.example")).limit(1);

  const rows = await db
    .select()
    .from(customTemplates)
    .where(or(eq(customTemplates.advertiserId, me.id), isNull(customTemplates.advertiserId)))
    .orderBy(desc(customTemplates.id));

  const saved: SavedTemplate[] = rows
    .filter((r) => isBlockLayout(r.layout))
    .map((r) => ({
      id: r.id,
      name: r.name,
      palette: r.palette,
      layout: r.layout as BlockLayout,
      style: r.style as CreativeStyle,
      sourceTemplateId: r.sourceTemplateId,
      shared: r.advertiserId === null,
    }));

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/builder"
      title="ড্র্যাগ ও ড্রপ লেআউট বিল্ডার"
      subtitle="ব্লক টেনে এনে নিজের মতো সাজান, অথবা যেকোনো টেমপ্লেট বেছে নিয়ে সেটিকে ভেঙে সম্পূর্ণ কাস্টম ক্রিয়েটিভ বানান — তারপর নিজের টেমপ্লেট হিসেবে সেভ করে বারবার ব্যবহার করুন।"
    >
      <BlockBuilder
        mode="client"
        advertiserId={me?.id ?? 2}
        initialSlot={sp.slot}
        initialTemplate={sp.template}
        action={builderSubmit}
        submitLabel="সেভ করে পেমেন্টে যান →"
        saved={saved}
        saveAction={saveCustomTemplate}
      />
    </ConsoleShell>
  );
}

import { desc } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, customTemplates } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV } from "@/components/console/Shell";
import BlockBuilder, { type SavedTemplate } from "@/components/studio/BlockBuilder";
import { adminBuilderSubmit, adminSaveCustomTemplate, deleteCustomTemplate } from "@/lib/ads/actions";
import { isBlockLayout, type BlockLayout } from "@/lib/ads/blocks";
import type { CreativeStyle } from "@/lib/ads/style";

export const dynamic = "force-dynamic";

export default async function AdminBuilder({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; template?: string; client?: string }>;
}) {
  const sp = await searchParams;
  const accs = await db.select().from(advertisers);
  const chosen = sp.client ? Number(sp.client) : accs.find((a) => a.role === "client")?.id ?? accs[0].id;

  const rows = await db.select().from(customTemplates).orderBy(desc(customTemplates.id));
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
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/builder"
      title="অ্যাডমিন লেআউট বিল্ডার"
      subtitle="ক্লায়েন্টের জন্য কাস্টম লেআউট বানিয়ে সরাসরি প্রকাশ করুন, জনস্বার্থ বিজ্ঞাপন বিনামূল্যে বসান, বা হাউস টেমপ্লেট তৈরি করে সবার জন্য শেয়ার করুন।"
      actions={
        <form className="flex items-center gap-2">
          <span className="c-label">ক্লায়েন্ট</span>
          <select name="client" defaultValue={String(chosen)} className="c-input w-56 py-1.5">
            {accs.map((a) => (
              <option key={a.id} value={a.id}>{a.company ?? a.name}</option>
            ))}
          </select>
          <button className="c-btn px-3 py-2 text-[11px]">বদলান</button>
        </form>
      }
    >
      <BlockBuilder
        mode="admin"
        advertiserId={chosen}
        initialSlot={sp.slot}
        initialTemplate={sp.template}
        action={adminBuilderSubmit}
        submitLabel="তৈরি করে সরাসরি প্রকাশ করুন →"
        saved={saved}
        saveAction={adminSaveCustomTemplate}
        deleteAction={deleteCustomTemplate}
      />
    </ConsoleShell>
  );
}

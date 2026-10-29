import Link from "next/link";
import { db } from "@/db";
import { advertisers } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV } from "@/components/console/Shell";
import CreativeStudio from "@/components/studio/CreativeStudio";
import { adminStudioSubmit } from "@/lib/ads/actions";

export const dynamic = "force-dynamic";

export default async function AdminStudio({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; template?: string; client?: string }>;
}) {
  const sp = await searchParams;
  const accs = await db.select().from(advertisers);
  const chosen = sp.client ? Number(sp.client) : accs.find((a) => a.role === "client")?.id ?? accs[0].id;

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/studio"
      title="অ্যাডমিন ক্রিয়েটিভ স্টুডিও"
      subtitle="ক্লায়েন্টের হয়ে বিজ্ঞাপন বানিয়ে সরাসরি লাইভ করুন — অথবা জনস্বার্থ বিজ্ঞাপন বিনামূল্যে বসান।"
      actions={
        <form className="flex items-center gap-2">
          <span className="c-label">ক্লায়েন্ট</span>
          <select name="client" defaultValue={String(chosen)} className="c-input w-56 py-1.5">
            {accs.map((a) => (
              <option key={a.id} value={a.id}>{a.company ?? a.name}</option>
            ))}
          </select>
          <button className="c-btn px-3 py-2 text-[11px]">বদলান</button>
          <Link href="/admin/ads/builder" className="c-btn c-btn-ghost px-3 py-2 text-[11px]">⠿ বিল্ডার</Link>
        </form>
      }
    >
      <CreativeStudio
        mode="admin"
        advertiserId={chosen}
        initialSlot={sp.slot}
        initialTemplate={sp.template}
        action={adminStudioSubmit}
        submitLabel="তৈরি করে সরাসরি লাইভ করুন →"
      />
    </ConsoleShell>
  );
}

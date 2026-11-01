import { listAdCreatives, listAdSlots } from "@hoichoi/db";
import { PortalManagementForms } from "@/components/ads/PortalManagementForms";
import { AdCreativeLibrary } from "@/components/ads/AdCreativeLibrary";
import { requireAdClient } from "@/lib/ad-client-auth";

export async function AdCreativeWorkspace({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const client = await requireAdClient();
  const [creatives, slots] = await Promise.all([
    listAdCreatives(client.id),
    listAdSlots(),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">CLIENT WORKSPACE</p>
        <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">{title}</h1>
        <p className="mt-1 text-[12px] text-ink-soft">{description}</p>
      </header>
      <PortalManagementForms mode="creative" creatives={creatives} slots={slots} />
      <section className="border border-ink/15 bg-card p-4">
        <div className="mb-3">
          <h2 className="font-serif-bn text-[17px] font-bold text-ink">আপনার creative</h2>
          <p className="mt-1 text-[11px] text-ink-soft">Preview দেখুন, সংরক্ষিত creative সম্পাদনা করুন, পরে বুকিংয়ে ব্যবহার করুন।</p>
        </div>
        <AdCreativeLibrary creatives={creatives} />
      </section>
    </div>
  );
}

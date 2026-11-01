import { listAdCreatives, listAdSlots } from "@hoichoi/db";
import { PortalManagementForms } from "@/components/ads/PortalManagementForms";
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
      {creatives.length > 0 && (
        <section className="border border-ink/15 bg-card p-4">
          <h2 className="font-serif-bn text-[17px] font-bold text-ink">আপনার creative</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {creatives.map((creative) => (
              <article key={creative.id} className="border border-ink/10 bg-paper p-3">
                <p className="text-[12px] font-bold text-ink">{creative.name}</p>
                <p className="mt-1 font-mono-x text-[9px] uppercase text-ink-soft">{creative.templateId} · {creative.palette}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

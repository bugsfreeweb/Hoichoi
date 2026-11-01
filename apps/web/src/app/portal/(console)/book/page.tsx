import { listAdCreatives, listAdSlots } from "@hoichoi/db";
import { PortalManagementForms } from "@/components/ads/PortalManagementForms";
import { requireAdClient } from "@/lib/ad-client-auth";

export const dynamic = "force-dynamic";

export default async function AdBookingRequestPage() {
  const client = await requireAdClient();
  const [creatives, slots] = await Promise.all([
    listAdCreatives(client.id),
    listAdSlots(),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">CAMPAIGN BOOKING</p>
        <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">বিজ্ঞাপন বুকিং</h1>
        <p className="mt-1 text-[12px] text-ink-soft">শুধু সক্রিয় platform ad slot বুক করা যাবে। প্রতিটি অনুরোধ প্রশাসক যাচাই করবেন।</p>
      </header>
      <PortalManagementForms mode="booking" creatives={creatives} slots={slots} />
    </div>
  );
}

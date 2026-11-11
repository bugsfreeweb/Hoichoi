import { getAdAnalytics, listAdBookings, listAdEvents } from "@hoichoi/db";
import { requireAdClient } from "@/lib/ad-client-auth";
import { ClientAnalyticsBoard } from "@/components/ads/ClientAnalyticsBoard";

export const dynamic = "force-dynamic";

export default async function AdClientAnalyticsPage() {
  const client = await requireAdClient();
  const [analytics, bookings, events] = await Promise.all([
    getAdAnalytics(client.id),
    listAdBookings(client.id),
    listAdEvents(client.id).catch(() => []),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">CAMPAIGN ANALYTICS</p>
        <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">ডেলিভারি অ্যানালিটিক্স</h1>
        <p className="mt-1 text-[12px] text-ink-soft">আপনার অনুমোদিত ক্যাম্পেইনের গত ১৪ দিনের বাস্তব ডেটা।</p>
      </header>
      <ClientAnalyticsBoard analytics={analytics} bookings={bookings} events={events} />
    </div>
  );
}

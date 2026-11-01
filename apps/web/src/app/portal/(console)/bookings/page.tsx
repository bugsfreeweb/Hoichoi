import { listAdBookings, listAdCreatives, listAdSlots } from "@hoichoi/db";
import Link from "next/link";
import { requireAdClient } from "@/lib/ad-client-auth";

export const dynamic = "force-dynamic";

export default async function AdClientBookingsPage() {
  const client = await requireAdClient();
  const [bookings, creatives, slots] = await Promise.all([
    listAdBookings(client.id),
    listAdCreatives(client.id),
    listAdSlots(),
  ]);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">BOOKING MANAGEMENT</p>
          <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">আমার বুকিং</h1>
          <p className="mt-1 text-[12px] text-ink-soft">অনুমোদন, সময়সীমা, স্লট এবং delivery metrics দেখুন।</p>
        </div>
        <Link href="/portal/book" className="bg-ink px-3 py-2 text-[10px] font-bold text-paper">+ নতুন বুকিং</Link>
      </header>
      {bookings.length ? (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="grid gap-3 border border-ink/15 bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-mono-x text-[10px] font-bold uppercase text-alizarin">{booking.slotKey} · {booking.status}</p>
                <p className="mt-1 text-[11px] text-ink-soft">
                  {creatives.find((creative) => creative.id === booking.creativeId)?.name ?? "Creative"} · {slots.find((slot) => slot.slotKey === booking.slotKey)?.name ?? booking.slotKey}
                </p>
                <p className="mt-1 text-[10px] text-ink-soft">{booking.startsAt.slice(0, 10)} — {booking.endsAt.slice(0, 10)} · {booking.days} দিন</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-[10px] sm:text-right">
                <dt className="text-ink-soft">Impressions</dt><dd className="font-mono-x text-ink">{booking.impressions.toLocaleString()}</dd>
                <dt className="text-ink-soft">Clicks</dt><dd className="font-mono-x text-ink">{booking.clicks.toLocaleString()}</dd>
                <dt className="text-ink-soft">মোট</dt><dd className="font-bold text-ink">৳{booking.totalBdt.toLocaleString()}</dd>
              </dl>
            </article>
          ))}
        </div>
      ) : <p className="border border-dashed border-ink/20 px-4 py-10 text-center text-[11px] text-ink-soft">কোনো বুকিং নেই। একটি creative তৈরি করে বুকিং অনুরোধ পাঠান।</p>}
    </div>
  );
}

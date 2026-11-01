import { listAdBookings } from "@hoichoi/db";
import { requireAdClient } from "@/lib/ad-client-auth";

export const dynamic = "force-dynamic";

export default async function AdClientPaymentsPage() {
  const client = await requireAdClient();
  const bookings = await listAdBookings(client.id);
  const total = bookings.reduce((sum, booking) => sum + booking.totalBdt, 0);
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">BILLING</p>
        <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">পেমেন্ট ও ইনভয়েস</h1>
        <p className="mt-1 text-[12px] text-ink-soft">বুকিংয়ের খরচ এবং billing status দেখুন।</p>
      </header>
      <div className="border border-amberx/30 bg-amberx/5 p-4 text-[11px] leading-relaxed text-ink">
        এই সাইটে এখনো কোনো payment gateway যুক্ত নেই। এখানে দেখানো booking amount estimate—অনুমোদিত payment workflow না থাকায় অনলাইনে অর্থ পরিশোধ বা invoice তৈরি হয় না।
      </div>
      <section className="border border-ink/15 bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif-bn text-[17px] font-bold text-ink">Booking estimate</h2>
          <strong className="font-display text-[18px] text-ink">৳{total.toLocaleString()}</strong>
        </div>
        {bookings.length ? <div className="divide-y divide-ink/10">{bookings.map((booking) => (
          <div key={booking.id} className="flex flex-wrap justify-between gap-2 py-3 text-[10px]">
            <span className="text-ink-soft">{booking.slotKey} · {booking.startsAt.slice(0, 10)} · {booking.status}</span>
            <span className="font-bold text-ink">৳{booking.totalBdt.toLocaleString()}</span>
          </div>
        ))}</div> : <p className="text-[11px] text-ink-soft">কোনো booking estimate নেই।</p>}
      </section>
    </div>
  );
}

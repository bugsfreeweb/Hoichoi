import Link from "next/link";
import type { AdAnalyticsDay, AdBooking, AdSlot } from "@hoichoi/db";

/**
 * Ad-ops overview: occupancy, revenue and delivery, all from real rows.
 *
 * The page used to be four counters followed by raw tables, so an operator could
 * not answer "what is live right now, and what is it earning?" without reading
 * every booking. This board answers that at a glance and links into the section
 * that fixes each number.
 *
 * Server-rendered: no client JavaScript, so it stays cheap on the admin route.
 */

function bn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function money(v: number): string {
  return `৳${bn(v.toLocaleString("en-US"))}`;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** True when a booking covers `day` (inclusive), regardless of status label. */
function covers(booking: AdBooking, day: string): boolean {
  const from = booking.startsAt.slice(0, 10);
  const to = booking.endsAt.slice(0, 10);
  return day >= from && day <= to && booking.status !== "rejected" && booking.status !== "draft";
}

export function AdsOverviewBoard({
  slots,
  bookings,
  analytics,
}: {
  slots: AdSlot[];
  bookings: AdBooking[];
  analytics: AdAnalyticsDay[];
}) {
  const today = dayKey(new Date());
  const liveBookings = bookings.filter((b) => b.status === "active" && covers(b, today));
  const liveSlots = new Set(liveBookings.map((b) => b.slotKey));
  const revenue = bookings
    .filter((b) => b.status === "active" || b.status === "completed")
    .reduce((sum, b) => sum + b.totalBdt, 0);
  const impressions = analytics.reduce((s, d) => s + d.impressions, 0);
  const clicks = analytics.reduce((s, d) => s + d.clicks, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const peakImpressions = Math.max(1, ...analytics.map((d) => d.impressions));

  const revenueBySlot = new Map<string, number>();
  for (const b of bookings) {
    if (b.status !== "active" && b.status !== "completed") continue;
    revenueBySlot.set(b.slotKey, (revenueBySlot.get(b.slotKey) ?? 0) + b.totalBdt);
  }
  const topSlots = [...revenueBySlot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = Math.max(1, ...topSlots.map(([, v]) => v));

  // Fourteen-day occupancy per slot from the real booking windows.
  const days = analytics.map((d) => d.date);

  const kpis = [
    { label: "সক্রিয় স্লট", value: bn(liveSlots.size), sub: `${bn(slots.length)} টির মধ্যে`, href: "/admin/ads/slots" },
    { label: "চলমান বুকিং", value: bn(liveBookings.length), sub: `${bn(bookings.length)} সর্বমোট`, href: "/admin/ads/bookings" },
    { label: "আয় (সক্রিয়+সম্পন্ন)", value: money(revenue), sub: "ভ্যাটসহ মোট", href: "/admin/ads/payments" },
    { label: "ইম্প্রেশন · ১৪ দিন", value: bn(impressions), sub: `${bn(clicks)} ক্লিক · CTR ${ctr.toFixed(1)}%`, href: "/admin/ads/analytics" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <Link
            key={k.label}
            href={k.href}
            className="group relative overflow-hidden border border-ink/15 bg-card px-4 py-3.5 transition-colors hover:border-ink/40"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-alizarin via-amberx to-lime opacity-60" />
            <p className="font-mono-x text-[9px] tracking-[0.16em] text-ink-soft uppercase">{k.label}</p>
            <p className="mt-1.5 font-display text-[22px] leading-none font-bold text-ink">{k.value}</p>
            <p className="mt-1 font-mono-x text-[10px] text-ink-soft">{k.sub}</p>
          </Link>
        ))}
      </div>

      <section className="border border-line bg-paper p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">▚ OCCUPANCY BOARD</p>
            <h2 className="mt-1 font-serif-bn text-[20px] font-black text-ink">স্লট দখল · শেষ ১৪ দিন</h2>
          </div>
          <p className="font-mono-x text-[9.5px] text-ink-soft uppercase">
            <span className="mr-1 inline-block h-2 w-2 bg-lime align-middle" /> বুকড
            <span className="ml-3 mr-1 inline-block h-2 w-2 bg-alizarin align-middle" /> আজ খালি
            <span className="ml-3 mr-1 inline-block h-2 w-2 bg-ink/15 align-middle" /> অতীত
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="font-mono-x text-[8.5px] tracking-[0.12em] text-ink-soft uppercase">
                <th className="pb-2 font-medium">স্লট</th>
                {days.map((d) => (
                  <th key={d} className="pb-2 text-center font-medium">{Number(d.slice(8))}</th>
                ))}
                <th className="pb-2 text-right font-medium">রেট/দিন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {slots.map((slot) => (
                <tr key={slot.slotKey} className="group">
                  <td className="py-1.5 pr-3">
                    <span className="block max-w-[190px] truncate font-serif-bn text-[12px] font-bold text-ink">
                      {slot.name}
                    </span>
                    <span className="font-mono-x text-[8.5px] text-ink-soft uppercase">
                      {slot.slotKey} · {slot.deliveryMode}
                    </span>
                  </td>
                  {days.map((d) => {
                    const booked = bookings.some((b) => b.slotKey === slot.slotKey && covers(b, d));
                    const isToday = d === today;
                    return (
                      <td key={d} className="py-1.5 text-center">
                        <span
                          title={`${slot.name} · ${d}${booked ? " · বুকড" : ""}`}
                          className={`inline-block h-3.5 w-3.5 ${
                            booked
                              ? "bg-lime"
                              : isToday && slot.enabled
                                ? "bg-alizarin/70"
                                : d < today
                                  ? "bg-ink/15"
                                  : "bg-ink/8"
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="py-1.5 pl-3 text-right font-mono-x text-[10.5px] text-ink-soft">
                    ৳{bn(slot.dayRateBdt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="border border-line bg-paper p-5 md:p-6">
          <p className="eyebrow">▚ DELIVERY</p>
          <h2 className="mt-1 font-serif-bn text-[20px] font-black text-ink">ইম্প্রেশন ধারা</h2>
          <div className="mt-4 flex h-32 items-end gap-1">
            {analytics.map((d) => (
              <div
                key={d.date}
                className="group relative flex-1"
                title={`${d.date} · ${d.impressions} impression · ${d.clicks} click`}
              >
                <div
                  className="w-full bg-gradient-to-t from-alizarin/35 to-alizarin transition-opacity group-hover:opacity-80"
                  style={{ height: `${Math.max(2, (d.impressions / peakImpressions) * 100)}%` }}
                />
                {d.clicks > 0 && (
                  <div
                    className="absolute bottom-0 left-1/2 w-1 -translate-x-1/2 bg-lime"
                    style={{ height: `${Math.max(3, (d.clicks / peakImpressions) * 100)}%` }}
                    title={`${d.clicks} click`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono-x text-[8.5px] text-ink-soft">
            <span>{analytics[0]?.date.slice(5)}</span>
            <span>{analytics[analytics.length - 1]?.date.slice(5)}</span>
          </div>
          <p className="mt-3 text-[11px] text-ink-soft">
            বার = impression · উঁচু সবুজ রেখা = click. ত্রুটি হলে দেখুন{" "}
            <Link href="/admin/ads/activity" className="font-bold text-alizarin hover:underline">ডেলিভারি অ্যাক্টিভিটি</Link>।
          </p>
        </section>

        <section className="border border-line bg-paper p-5 md:p-6">
          <p className="eyebrow">▚ REVENUE BY SLOT</p>
          <h2 className="mt-1 font-serif-bn text-[20px] font-black text-ink">আয়ের বণ্টন</h2>
          {topSlots.length === 0 ? (
            <p className="mt-4 text-[12px] text-ink-soft">এখনো কোনো আয় নেই — প্রথম বুকিং তৈরি করুন।</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {topSlots.map(([key, value]) => {
                const slot = slots.find((s) => s.slotKey === key);
                return (
                  <li key={key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-serif-bn text-[12px] font-bold text-ink">
                        {slot?.name ?? key}
                      </span>
                      <span className="font-mono-x text-[10.5px] text-ink-soft">{money(value)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amberx to-alizarin"
                        style={{ width: `${Math.max(4, (value / topMax) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-ink-soft">
            শুধু active/completed বুকিং গণনা করা হয়েছে ·{" "}
            <Link href="/admin/ads/payments" className="font-bold text-alizarin hover:underline">পেমেন্ট দেখুন</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

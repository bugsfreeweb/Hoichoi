import Link from "next/link";
import { listAdBookings, listAdCreatives, listAdSlots } from "@hoichoi/db";
import { PortalManagementForms } from "@/components/ads/PortalManagementForms";
import { requireAdClient } from "@/lib/ad-client-auth";

export const dynamic = "force-dynamic";

export default async function AdClientPortal({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const client = await requireAdClient();
  const { created } = await searchParams;
  const [bookings, creatives, slots] = await Promise.all([
    listAdBookings(client.id),
    listAdCreatives(client.id),
    listAdSlots(),
  ]);
  const notice = created === "creative"
    ? "ক্রিয়েটিভ সংরক্ষিত হয়েছে।"
    : created === "booking"
      ? "বুকিং অনুরোধ প্রশাসকের কাছে পাঠানো হয়েছে।"
      : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">ADVERTISER PORTAL</p>
        <h1 className="mt-1 font-serif-bn text-[30px] font-black">ক্লায়েন্ট ড্যাশবোর্ড</h1>
        <p className="mt-1 text-[12px] text-ink-soft">আপনার ক্রিয়েটিভ তৈরি করুন, বিজ্ঞাপন স্লট বুকিংয়ের অনুরোধ পাঠান এবং ফলাফল দেখুন।</p>
      </header>
      {notice && <p role="status" className="border border-lime/30 bg-lime/10 px-4 py-3 text-[12px] font-semibold">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["ক্রিয়েটিভ", creatives.length],
          ["বুকিং অনুরোধ", bookings.length],
          ["চালু বিজ্ঞাপন", bookings.filter((item) => item.status === "active").length],
        ].map(([label, total]) => (
          <div key={label} className="border border-ink/15 bg-card p-4">
            <p className="text-[10px] text-ink-soft">{label}</p>
            <p className="mt-1 font-display text-[24px] font-bold">{total}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3">
          <h2 className="font-serif-bn text-[20px] font-extrabold">ক্যাম্পেইন তৈরি</h2>
          <p className="mt-1 text-[11px] text-ink-soft">ক্রিয়েটিভ সংরক্ষণের পর বুকিং অনুরোধ পাঠান। প্রকাশের আগে প্রতিটি বুকিং প্রশাসক যাচাই করবেন।</p>
        </div>
        <PortalManagementForms creatives={creatives} slots={slots} />
      </section>

      <section className="border border-ink/15 bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif-bn text-[20px] font-extrabold">আপনার বুকিং</h2>
            <p className="mt-1 text-[11px] text-ink-soft">বুকিংয়ের অনুমোদন ও প্রকাশের অবস্থা এখানে দেখুন।</p>
          </div>
          <Link href="/advertise" className="text-[11px] font-bold text-alizarin hover:underline">বিজ্ঞাপন তথ্য</Link>
        </div>
        {bookings.length ? (
          <div className="mt-4 divide-y divide-ink/10">
            {bookings.map((item) => (
              <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-mono-x text-[10px] font-bold uppercase">{item.slotKey} · {item.days} দিন</p>
                  <p className="mt-1 text-[10px] text-ink-soft">{new Date(item.startsAt).toLocaleDateString("bn-BD")} – {new Date(item.endsAt).toLocaleDateString("bn-BD")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">৳{item.totalBdt.toLocaleString("en-US")}</p>
                  <p className="text-[10px] text-ink-soft">{item.status}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 border border-dashed border-ink/20 px-4 py-6 text-center text-[11px] text-ink-soft">এখনো কোনো বুকিং অনুরোধ নেই।</p>
        )}
      </section>
    </div>
  );
}

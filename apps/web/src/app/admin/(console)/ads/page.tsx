import { listAdSlots, listAdCreatives, listAdBookings, listAdClients } from "@hoichoi/db";

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const [slots, creatives, bookings, clients] = await Promise.all([
    listAdSlots(),
    listAdCreatives(),
    listAdBookings(),
    listAdClients(),
  ]);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">▚ AD MANAGEMENT · বিজ্ঞাপন ব্যবস্থাপনা</p>
          <h1 className="mt-2 font-serif-bn text-[32px] font-black text-ink md:text-[40px]">বিজ্ঞাপন</h1>
          <p className="mt-1 text-[13px] text-ink-soft">বিজ্ঞাপন স্লট, ক্রিয়েটিভ, বুকিং ও অ্যানালিটিক্স পরিচালনা করুন।</p>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["স্লট", slots.length],
          ["ক্রিয়েটিভ", creatives.length],
          ["বুকিং", bookings.length],
          ["ক্লায়েন্ট", clients.length],
        ].map(([label, value]) => (
          <div key={label} className="border border-ink/15 bg-card px-4 py-3">
            <p className="font-mono-x text-[9px] tracking-[0.15em] text-ink-soft uppercase">{label}</p>
            <p className="mt-1 font-display text-[22px] font-bold text-ink">{value}</p>
      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ AD SLOTS</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">বিজ্ঞাপন স্লটসমূহ</h2>
        {slots.length ? (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div key={slot.slotKey} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-mono-x text-[10px] tracking-[0.12em] text-alizarin uppercase">{slot.slotKey}</p>
                  <p className="mt-1 font-serif-bn text-[15px] font-bold text-ink">{slot.name}</p>
                  {slot.description && <p className="mt-0.5 text-[11.5px] text-ink-soft">{slot.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-[10px] font-bold ${slot.enabled ? "bg-lime text-paper" : "bg-ink/10 text-ink-soft"}`}>
                    {slot.enabled ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </span>
                  <span className="font-mono-x text-[11px] text-ink-soft">৳{slot.dayRateBdt}/দিন</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো স্লট পাওয়া যায়নি। মাইগ্রেশন চালান।</p>
        )}
      </section>
          </div>
        ))}
      </div>
      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ CREATIVES</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">ক্রিয়েটিভস</h2>
        {creatives.length ? (
          <div className="space-y-3">
            {creatives.map((creative) => (
              <div key={creative.id} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-serif-bn text-[15px] font-bold text-ink">{creative.name}</p>
                  <p className="mt-0.5 font-mono-x text-[10px] text-ink-soft uppercase">{creative.templateId} · {creative.palette}</p>
                </div>
                <span className="font-mono-x text-[10px] text-ink-soft">{creative.baseLang}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো ক্রিয়েটিভ পাওয়া যায়নি।</p>
        )}
      </section>

      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ BOOKINGS</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">বুকিংস</h2>
        {bookings.length ? (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-mono-x text-[10px] tracking-[0.12em] text-alizarin uppercase">{booking.slotKey}</p>
                  <p className="mt-1 font-mono-x text-[9px] text-ink-soft uppercase">{booking.status} · {booking.days} দিন</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[16px] font-bold text-ink">৳{booking.totalBdt}</p>
                  <p className="font-mono-x text-[9px] text-ink-soft">{booking.impressions} imp · {booking.clicks} clk</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো বুকিং পাওয়া যায়নি।</p>
        )}
      </section>

      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ CLIENTS</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">ক্লায়েন্টস</h2>
        {clients.length ? (
          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-serif-bn text-[15px] font-bold text-ink">{client.name}</p>
                  <p className="mt-0.5 font-mono-x text-[10px] text-ink-soft">{client.email} · {client.role}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold ${client.status === "approved" ? "bg-lime text-paper" : "bg-ink/10 text-ink-soft"}`}>
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো ক্লায়েন্ট পাওয়া যায়নি।</p>
        )}
      </section>
    </div>
  );
}
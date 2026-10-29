import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, slotConfig } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV, StatusPill, SectionCard } from "@/components/console/Shell";
import AdPreviewBox from "@/components/console/AdPreviewBox";
import { SLOTS, FORMAT_LABEL, quotePrice } from "@/lib/ads/slots";
import { adminToggleSlot, adminSetSlotRate } from "@/lib/ads/actions";

export const dynamic = "force-dynamic";

export default async function SlotManager() {
  const [cfgs, bks] = await Promise.all([
    db.select().from(slotConfig),
    db.select().from(bookings).where(eq(bookings.status, "active")).orderBy(desc(bookings.priority)),
  ]);

  const pages = ["home", "post", "category", "global"] as const;
  const pageLabel: Record<string, string> = {
    home: "হোম পেজ",
    post: "প্রতিবেদন পেজ",
    category: "বিভাগ পেজ",
    global: "সব পেজ (গ্লোবাল)",
  };

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/slots"
      title="স্লট ম্যানেজার"
      subtitle="প্রতিটি স্লট চালু/বন্ধ করুন, রেট বদলান, আর দেখুন এখন কোন ক্রিয়েটিভ সেখানে বসছে। LIVE ব্যাজ = সাইটে আগে থেকেই আছে।"
    >
      {pages.map((pg) => {
        const list = SLOTS.filter((s) => s.page === pg);
        return (
          <div key={pg} className="mb-8">
            <h2 className="mb-3 flex items-center gap-3 font-serif-bn text-[20px] font-black text-ink">
              <span className="h-2.5 w-2.5 rotate-45 bg-alizarin" />
              {pageLabel[pg]}
              <span className="font-mono-x text-[10px] font-medium tracking-[0.2em] text-ink-soft uppercase">
                {list.length} slots
              </span>
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((s) => {
                const cfg = cfgs.find((c) => c.slotKey === s.key);
                const enabled = cfg?.enabled ?? true;
                const rate = cfg?.dayRateBdt ?? s.dayRate;
                const occupied = bks.filter((b) => b.slotKey === s.key);
                const m = quotePrice(s.key, 30);

                return (
                  <section key={s.key} className={`c-card ${enabled ? "" : "opacity-70"}`}>
                    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/12 px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`c-pill ${s.existing ? "st-active" : "st-draft"}`}>
                            {s.existing ? "LIVE ON SITE" : "NEW"}
                          </span>
                          <h3 className="font-serif-bn text-[16px] font-black text-ink">{s.label}</h3>
                        </div>
                        <p className="mt-1 font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">
                          {s.key} · {FORMAT_LABEL[s.format]} · {s.size}
                        </p>
                      </div>
                      <form action={adminToggleSlot}>
                        <input type="hidden" name="slotKey" value={s.key} />
                        <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
                        <button className={`c-btn px-3 py-1.5 text-[11px] ${enabled ? "" : "c-btn-lime"}`}>
                          {enabled ? "বন্ধ করুন" : "চালু করুন"}
                        </button>
                      </form>
                    </header>

                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                      <div>
                        <p className="c-label">এই মুহূর্তে যা দেখা যাচ্ছে</p>
                        <div className="mt-2 border border-ink/15 bg-paper-deep/30 p-2">
                          <AdPreviewBox slotKey={s.key} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[12px] leading-relaxed text-ink-soft">{s.area}</p>
                        <p className="text-[11.5px] leading-relaxed text-ink-soft">{s.note}</p>

                        <div>
                          <p className="c-label">চাহিদা স্কোর</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-ink/10">
                              <div className="h-full bg-lime" style={{ width: `${s.heat}%` }} />
                            </div>
                            <span className="font-mono-x text-[10px]">{s.heat}</span>
                          </div>
                        </div>

                        <form action={adminSetSlotRate} className="flex items-end gap-2">
                          <input type="hidden" name="slotKey" value={s.key} />
                          <div className="flex-1">
                            <label className="c-label">দৈনিক রেট (৳)</label>
                            <input className="c-input mt-1" name="dayRate" type="number" defaultValue={rate} />
                          </div>
                          <button className="c-btn px-3 py-2 text-[11px]">সেভ</button>
                        </form>

                        <p className="font-mono-x text-[10px] text-ink-soft uppercase">
                          ৩০ দিনে ৳{m.total.toLocaleString()} (ভ্যাটসহ)
                        </p>

                        <div>
                          <p className="c-label">বর্তমান বুকিং</p>
                          {occupied.length === 0 ? (
                            <p className="mt-1 text-[12px] text-ink-soft">খালি — হাউস অ্যাড দেখানো হচ্ছে।</p>
                          ) : (
                            <ul className="mt-1 space-y-1">
                              {occupied.map((b) => (
                                <li key={b.id} className="flex items-center justify-between text-[11.5px]">
                                  <span className="font-mono-x">{b.ref}</span>
                                  <span className="flex items-center gap-1.5">
                                    <span className="font-mono-x text-ink-soft">P{b.priority}</span>
                                    <StatusPill s={b.status} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        );
      })}

      <SectionCard title="স্লট কীভাবে পূরণ হয়">
        <ol className="space-y-2 text-[12.5px] text-ink-soft">
          <li className="flex gap-2"><span className="font-mono-x text-alizarin">০১</span> স্লটের জন্য active বুকিং খোঁজা হয় যার তারিখ-সীমা আজকের মধ্যে পড়ে।</li>
          <li className="flex gap-2"><span className="font-mono-x text-alizarin">০২</span> একাধিক থাকলে সবচেয়ে বেশি <b>priority</b> জেতে; সমান হলে নতুনটি।</li>
          <li className="flex gap-2"><span className="font-mono-x text-alizarin">০৩</span> কিছু না থাকলে সাইটের নিজস্ব হাউস অ্যাড (“আপনার বিজ্ঞাপন এখানে”) দেখানো হয় — জায়গা কখনো ফাঁকা দেখায় না।</li>
          <li className="flex gap-2"><span className="font-mono-x text-alizarin">০৪</span> স্লট বন্ধ করলে ঐ জায়গায় কিছুই রেন্ডার হয় না, লেআউট অক্ষত থাকে।</li>
        </ol>
      </SectionCard>
    </ConsoleShell>
  );
}

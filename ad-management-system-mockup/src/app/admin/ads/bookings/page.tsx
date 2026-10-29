import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, creatives } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV, StatusPill, Money, SectionCard } from "@/components/console/Shell";
import Creative from "@/components/ads/Creative";
import { SLOTS, SLOT_MAP, FORMAT_LABEL, DURATIONS } from "@/lib/ads/slots";
import { TEMPLATES, TEMPLATE_MAP, CATEGORY_LABEL } from "@/lib/ads/templates";
import { adminSetBookingStatus, adminSetPriority, adminManualBooking } from "@/lib/ads/actions";
import type { CreativeKind, PaletteKey } from "@/lib/ads/types";
import type { CreativeStyle } from "@/lib/ads/style";
import { isBlockLayout } from "@/lib/ads/blocks";

export const dynamic = "force-dynamic";

const NEXT_STATUS = [
  ["active", "লাইভ করুন"],
  ["paused", "বিরতি"],
  ["in_review", "রিভিউ"],
  ["rejected", "বাতিল"],
  ["expired", "মেয়াদ শেষ"],
];

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.status;

  const rows = await db
    .select({ b: bookings, a: advertisers, c: creatives })
    .from(bookings)
    .innerJoin(advertisers, eq(bookings.advertiserId, advertisers.id))
    .innerJoin(creatives, eq(bookings.creativeId, creatives.id))
    .orderBy(desc(bookings.id));

  const accs = await db.select().from(advertisers);
  const list = filter ? rows.filter((r) => r.b.status === filter) : rows;

  const counts = rows.reduce<Record<string, number>>((m, r) => {
    m[r.b.status] = (m[r.b.status] ?? 0) + 1;
    return m;
  }, {});

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/bookings"
      title="বুকিং ম্যানেজার"
      subtitle="ক্লায়েন্টের প্রতিটি বুকিং স্বয়ংক্রিয়ভাবে এখানে আসে। অ্যাডমিন চাইলে স্ট্যাটাস, অগ্রাধিকার বদলাতে বা নিজেই নতুন বুকিং বসাতে পারেন।"
      actions={<Link href="/admin/ads/bookings?new=1" className="c-btn c-btn-lime">+ ম্যানুয়াল বুকিং</Link>}
    >
      {/* manual booking composer */}
      {sp.new ? (
        <div className="mb-6">
          <SectionCard title="ম্যানুয়াল বুকিং তৈরি করুন" right={<Link href="/admin/ads/bookings" className="font-mono-x text-[10px] text-ink-soft uppercase">বন্ধ ✕</Link>}>
            <form action={adminManualBooking} className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="c-label">ক্লায়েন্ট</label>
                <select name="advertiserId" className="c-input mt-1">
                  {accs.map((a) => (
                    <option key={a.id} value={a.id}>{a.company ?? a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="c-label">স্লট</label>
                <select name="slotKey" className="c-input mt-1">
                  {SLOTS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label} ({FORMAT_LABEL[s.format]})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="c-label">টেমপ্লেট</label>
                <select name="templateId" className="c-input mt-1">
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>{t.nameBn} — {CATEGORY_LABEL[t.category]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="c-label">মেয়াদ</label>
                <select name="days" className="c-input mt-1">
                  {DURATIONS.map((d) => (
                    <option key={d.days} value={d.days}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="c-label">হেডলাইন (ঐচ্ছিক — ফাঁকা রাখলে টেমপ্লেটের লেখা)</label>
                <input className="c-input mt-1" name="headline" placeholder="যেমন: নিখোঁজ — রাফিদ হাসান (৮)" />
              </div>
              <div className="md:col-span-2">
                <label className="c-label">সাব-হেডলাইন</label>
                <input className="c-input mt-1" name="sub" />
              </div>
              <div>
                <label className="c-label">বাটনের লেখা</label>
                <input className="c-input mt-1" name="cta" />
              </div>
              <div className="md:col-span-2">
                <label className="c-label">URL</label>
                <input className="c-input mt-1" name="url" placeholder="https://…" />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
                  <input type="checkbox" name="free" value="1" defaultChecked className="h-4 w-4" />
                  বিনামূল্যে (জনস্বার্থ)
                </label>
              </div>

              <div className="md:col-span-4">
                <button className="c-btn c-btn-lime w-full py-3">সরাসরি লাইভ করে দিন</button>
                <p className="mt-2 text-[11px] text-ink-soft">
                  ম্যানুয়াল বুকিং সাথে সাথেই active হয় এবং priority 8 পায়, তাই এটি অন্য বুকিংকে ছাপিয়ে যাবে।
                </p>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : null}

      {/* status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/ads/bookings" className={`c-pill ${!filter ? "st-active" : "st-draft"}`}>সব {rows.length}</Link>
        {Object.entries(counts).map(([s, n]) => (
          <Link key={s} href={`/admin/ads/bookings?status=${s}`} className={`c-pill ${filter === s ? "st-active" : "st-draft"}`}>
            {s} {n}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {list.map(({ b, a, c }) => {
          const slot = SLOT_MAP[b.slotKey];
          const tpl = TEMPLATE_MAP[c.templateId];
          const ctr = b.impressions ? ((b.clicks / b.impressions) * 100).toFixed(2) : "0.00";
          return (
            <article key={b.id} className="c-card">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/12 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono-x text-[12px] font-bold text-ink">{b.ref}</span>
                  <span className="font-serif-bn text-[15px] font-black text-ink">{slot?.label ?? b.slotKey}</span>
                  <span className="font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">
                    {a.company ?? a.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {b.manual ? <span className="c-pill st-draft">ম্যানুয়াল</span> : <span className="c-pill st-active">অটো</span>}
                  <StatusPill s={b.status} />
                </div>
              </header>

              <div className="grid gap-4 p-4 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  {tpl && slot ? (
                    <div className="border border-ink/15 bg-paper-deep/30 p-2">
                      <Creative
                        kind={tpl.kind as CreativeKind}
                        palette={c.palette as PaletteKey}
                        data={{ ...tpl.data, ...(c.data as object) }}
                        format={slot.format}
                        style={c.style as CreativeStyle}
                        layout={isBlockLayout(c.layout) ? c.layout : null}
                      />
                    </div>
                  ) : null}
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] lg:col-span-5">
                  {[
                    ["ক্লায়েন্ট", a.name],
                    ["টেমপ্লেট", tpl?.nameBn ?? c.templateId],
                    ["ফরম্যাট", slot ? FORMAT_LABEL[slot.format] : "—"],
                    ["শুরু", b.startsAt.toISOString().slice(0, 10)],
                    ["শেষ", b.endsAt.toISOString().slice(0, 10)],
                    ["দিন", String(b.days)],
                    ["ইম্প্রেশন", b.impressions.toLocaleString()],
                    ["ক্লিক / CTR", `${b.clicks.toLocaleString()} · ${ctr}%`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-ink/10 py-1">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="font-semibold text-ink">{v}</dd>
                    </div>
                  ))}
                  <div className="col-span-2 flex justify-between pt-1.5 text-[14px] font-black">
                    <dt>মোট</dt>
                    <dd><Money v={b.totalBdt} /></dd>
                  </div>
                </dl>

                <div className="space-y-3 lg:col-span-4">
                  <div>
                    <p className="c-label">স্ট্যাটাস বদলান</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {NEXT_STATUS.map(([s, label]) => (
                        <form key={s} action={adminSetBookingStatus}>
                          <input type="hidden" name="bookingId" value={b.id} />
                          <input type="hidden" name="status" value={s} />
                          <button className={`c-btn px-2.5 py-1 text-[10.5px] ${b.status === s ? "c-btn-lime" : "c-btn-ghost"}`}>
                            {label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>

                  <form action={adminSetPriority} className="flex items-end gap-2">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <div className="flex-1">
                      <label className="c-label">অগ্রাধিকার (বেশি = আগে দেখাবে)</label>
                      <input className="c-input mt-1" type="number" name="priority" defaultValue={b.priority} />
                    </div>
                    <button className="c-btn px-3 py-2 text-[11px]">সেভ</button>
                  </form>

                  {b.adminNote ? (
                    <p className="border-l-2 border-alizarin pl-2 text-[11.5px] text-ink-soft">{b.adminNote}</p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </ConsoleShell>
  );
}

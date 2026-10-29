import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, creatives, payments, activity, slotConfig } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV, Stat, StatusPill, Money, SectionCard } from "@/components/console/Shell";
import LiveBar from "@/components/console/LiveBar";
import { AreaChart, DonutChart, Sparkline } from "@/components/charts/Charts";
import { buildAnalytics } from "@/lib/ads/analytics";
import { SLOTS, SLOT_MAP, FORMAT_LABEL } from "@/lib/ads/slots";
import { TEMPLATES } from "@/lib/ads/templates";

export const dynamic = "force-dynamic";

export default async function AdminAdsHome() {
  const analytics = await buildAnalytics();
  const [bks, pays, accs, acts, cfgs] = await Promise.all([
    db.select({ b: bookings, a: advertisers }).from(bookings).innerJoin(advertisers, eq(bookings.advertiserId, advertisers.id)).orderBy(desc(bookings.id)),
    db.select().from(payments).orderBy(desc(payments.id)),
    db.select().from(advertisers),
    db.select().from(activity).orderBy(desc(activity.id)).limit(10),
    db.select().from(slotConfig),
  ]);

  const live = bks.filter((r) => r.b.status === "active");
  const pending = bks.filter((r) => ["pending_payment", "in_review"].includes(r.b.status));
  const revenue = pays.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountBdt, 0);
  const due = pays.filter((p) => p.status === "initiated").reduce((s, p) => s + p.amountBdt, 0);
  const impressions = bks.reduce((s, r) => s + r.b.impressions, 0);
  const clicks = bks.reduce((s, r) => s + r.b.clicks, 0);
  const disabled = cfgs.filter((c) => !c.enabled).length;

  const occupancy = SLOTS.map((s) => ({
    slot: s,
    booked: live.filter((r) => r.b.slotKey === s.key).length,
  }));
  const filled = occupancy.filter((o) => o.booked > 0).length;

  // revenue per slot
  const bySlot = new Map<string, number>();
  for (const r of bks) bySlot.set(r.b.slotKey, (bySlot.get(r.b.slotKey) ?? 0) + r.b.totalBdt);
  const topSlots = [...bySlot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxRev = topSlots[0]?.[1] || 1;

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads"
      title="বিজ্ঞাপন ড্যাশবোর্ড"
      subtitle="সব বুকিং, পেমেন্ট ও স্লট অকুপেন্সি স্বয়ংক্রিয়ভাবে আপডেট হয়। প্রয়োজনে প্রতিটি জিনিস ম্যানুয়ালি বদলানো যায়।"
      actions={
        <>
          <Link href="/admin/ads/studio" className="c-btn c-btn-lime">🎨 স্টুডিও</Link>
          <Link href="/admin/ads/builder" className="c-btn c-btn-ghost">⠿ লেআউট বিল্ডার</Link>
          <Link href="/admin/ads/bookings?new=1" className="c-btn c-btn-ghost">+ ম্যানুয়াল বুকিং</Link>
          <Link href="/admin/ads/analytics" className="c-btn c-btn-ghost">অ্যানালিটিক্স</Link>
        </>
      }
    >
      <LiveBar />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="লাইভ বিজ্ঞাপন" value={String(live.length)} sub={`${filled}/${SLOTS.length} স্লট পূর্ণ`} />
        <Stat label="অপেক্ষমাণ" value={String(pending.length)} sub="পেমেন্ট / রিভিউ" accent="#b45309" />
        <Stat label="আয় (পরিশোধিত)" value={`৳${revenue.toLocaleString()}`} sub={`বকেয়া ৳${due.toLocaleString()}`} accent="#037c1b" />
        <Stat label="ইম্প্রেশন" value={impressions.toLocaleString()} sub={`ক্লিক ${clicks.toLocaleString()}`} accent="#0b7c72" />
        <Stat label="ক্লায়েন্ট" value={String(accs.filter((a) => a.role === "client").length)} sub={`${accs.filter((a) => a.status === "pending").length} টি অনুমোদনের অপেক্ষায়`} accent="#2563eb" />
        <Stat label="টেমপ্লেট" value={String(TEMPLATES.length)} sub={`${disabled} স্লট বন্ধ`} accent="#d2202c" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="১৪ দিনের ডেলিভারি"
            right={<Link href="/admin/ads/analytics" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase">সম্পূর্ণ অ্যানালিটিক্স →</Link>}
          >
            <AreaChart
              height={170}
              colors={["#0b7c72", "#d2202c"]}
              labels={["ইম্প্রেশন", "ক্লিক ×২০"]}
              series={[
                { name: "ইম্প্রেশন", points: analytics.series.map((d) => ({ x: d.x, y: d.impressions })) },
                { name: "ক্লিক", points: analytics.series.map((d) => ({ x: d.x, y: d.clicks * 20 })) },
              ]}
            />
          </SectionCard>
        </div>
        <SectionCard title="ফরম্যাট মিশ্রণ">
          <DonutChart
            data={analytics.byFormat}
            size={150}
            centerValue={`${Math.round(analytics.totals.impressions / 1000)}k`}
            centerLabel="ইম্প্রেশন"
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* occupancy board */}
        <div className="lg:col-span-2">
          <SectionCard
            title="স্লট অকুপেন্সি বোর্ড"
            right={<Link href="/admin/ads/slots" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase">ম্যানেজ →</Link>}
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {occupancy.map(({ slot, booked }) => {
                const cfg = cfgs.find((c) => c.slotKey === slot.key);
                const off = cfg && !cfg.enabled;
                return (
                  <div
                    key={slot.key}
                    className={`border p-3 ${off ? "border-ink/15 bg-ink/[0.03] opacity-60" : booked ? "border-lime bg-lime/[0.07]" : "border-dashed border-ink/30"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-serif-bn text-[13px] font-bold text-ink">{slot.label}</span>
                      <span className={`c-pill ${off ? "st-expired" : booked ? "st-active" : "st-draft"}`}>
                        {off ? "বন্ধ" : booked ? "বুকড" : "খালি"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono-x text-[9px] tracking-[0.14em] text-ink-soft uppercase">
                      {FORMAT_LABEL[slot.format]} · ৳{(cfg?.dayRateBdt ?? slot.dayRate).toLocaleString()}/দিন
                    </p>
                    <div className="mt-2 h-1 w-full bg-ink/10">
                      <div className="h-full bg-alizarin" style={{ width: `${slot.heat}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title="সাম্প্রতিক বুকিং"
              right={<Link href="/admin/ads/bookings" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase">সব →</Link>}
            >
              <div className="scroll-x">
                <table className="c-table">
                  <thead>
                    <tr><th>রেফ</th><th>ক্লায়েন্ট</th><th>স্লট</th><th>স্ট্যাটাস</th><th>ট্রেন্ড</th><th className="text-right">ইম্প.</th><th className="text-right">মোট</th></tr>
                  </thead>
                  <tbody>
                    {bks.slice(0, 8).map(({ b, a }) => (
                      <tr key={b.id}>
                        <td className="font-mono-x text-[11px] font-bold">{b.ref}</td>
                        <td className="text-[12px]">{a.company ?? a.name}</td>
                        <td className="text-[12px]">{SLOT_MAP[b.slotKey]?.label ?? b.slotKey}</td>
                        <td className="flex items-center gap-1.5">
                          <StatusPill s={b.status} />
                          {b.manual ? <span className="c-pill st-draft">M</span> : null}
                        </td>
                        <td><Sparkline points={Array.from({ length: 10 }, (_, i) => Math.round((b.impressions / 10) * (0.6 + ((Math.sin(b.id * 9301 + i * 49297) * 43758.5453) % 1 + 1) % 1 * 0.8)))} w={70} h={22} /></td>
                        <td className="text-right font-mono-x">{b.impressions.toLocaleString()}</td>
                        <td className="text-right"><Money v={b.totalBdt} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* side column */}
        <div className="space-y-6">
          <SectionCard title="স্লট অনুযায়ী আয়">
            <div className="space-y-3">
              {topSlots.map(([key, v]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-ink">{SLOT_MAP[key]?.label ?? key}</span>
                    <span className="font-mono-x font-bold">৳{v.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-ink/10">
                    <div className="h-full bg-lime" style={{ width: `${Math.round((v / maxRev) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="অটোমেশন লগ"
            right={<Link href="/admin/ads/activity" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase">সব →</Link>}
          >
            <ul className="space-y-3">
              {acts.map((a) => (
                <li key={a.id} className="border-b border-ink/10 pb-2.5 last:border-0">
                  <p className="flex items-center justify-between font-mono-x text-[9.5px] tracking-[0.16em] uppercase">
                    <span className={a.actor === "system" ? "text-lime" : "text-alizarin"}>{a.actor === "system" ? "AUTO" : "MANUAL"}</span>
                    <span className="text-ink-soft">{a.createdAt.toISOString().slice(5, 16).replace("T", " ")}</span>
                  </p>
                  <p className="mt-1 text-[12.5px] font-bold text-ink">{a.action} · {a.subject}</p>
                  <p className="text-[11.5px] text-ink-soft">{a.detail}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </ConsoleShell>
  );
}

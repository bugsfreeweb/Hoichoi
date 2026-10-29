import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, creatives, payments } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV, Stat, StatusPill, Money, SectionCard } from "@/components/console/Shell";
import LiveBar from "@/components/console/LiveBar";
import { AreaChart, Sparkline } from "@/components/charts/Charts";
import { buildAnalytics } from "@/lib/ads/analytics";
import Creative from "@/components/ads/Creative";
import { SLOT_MAP, FORMAT_LABEL } from "@/lib/ads/slots";
import { TEMPLATE_MAP } from "@/lib/ads/templates";
import type { CreativeKind, PaletteKey } from "@/lib/ads/types";
import type { CreativeStyle } from "@/lib/ads/style";
import { isBlockLayout } from "@/lib/ads/blocks";

export const dynamic = "force-dynamic";

/** demo session — the seeded "রঙ বাংলাদেশ" account */
export const CURRENT_CLIENT_EMAIL = "tanvir@rang.example";

export default async function PortalHome() {
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, CURRENT_CLIENT_EMAIL)).limit(1);

  const rows = await db
    .select({ b: bookings, c: creatives })
    .from(bookings)
    .innerJoin(creatives, eq(bookings.creativeId, creatives.id))
    .where(eq(bookings.advertiserId, me.id))
    .orderBy(desc(bookings.id));

  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.advertiserId, me.id))
    .orderBy(desc(payments.id))
    .limit(6);

  const analytics = await buildAnalytics(me.id);
  const live = rows.filter((r) => r.b.status === "active");
  const impressions = rows.reduce((s, r) => s + r.b.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.b.clicks, 0);
  const spend = pays.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountBdt, 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal"
      title={`স্বাগতম, ${me.name}`}
      subtitle={`${me.company} · অ্যাকাউন্ট স্ট্যাটাস: ${me.status} · ক্রেডিট ব্যালান্স ৳${me.creditBdt.toLocaleString()}`}
      actions={
        <>
          <Link href="/portal/studio" className="c-btn c-btn-lime">🎨 স্টুডিও</Link>
          <Link href="/portal/builder" className="c-btn c-btn-ghost">⠿ লেআউট বিল্ডার</Link>
          <Link href="/portal/book" className="c-btn c-btn-ghost">দ্রুত বুকিং</Link>
          <Link href="/portal/analytics" className="c-btn c-btn-ghost">অ্যানালিটিক্স</Link>
        </>
      }
    >
      <LiveBar showSlots={false} intervalMs={6000} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="চলমান বিজ্ঞাপন" value={String(live.length)} sub="এই মুহূর্তে সাইটে দেখা যাচ্ছে" />
        <Stat label="মোট ইম্প্রেশন" value={impressions.toLocaleString()} sub="সব বুকিং মিলিয়ে" accent="#0b7c72" />
        <Stat label="মোট ক্লিক" value={clicks.toLocaleString()} sub={`CTR ${ctr}%`} accent="#b45309" />
        <Stat label="মোট খরচ" value={`৳${spend.toLocaleString()}`} sub="পরিশোধিত ইনভয়েস" accent="#d2202c" />
        <Stat label="ক্রেডিট" value={`৳${me.creditBdt.toLocaleString()}`} sub="পরবর্তী বুকিংয়ে ব্যবহারযোগ্য" accent="#2563eb" />
      </div>

      <div className="mt-6">
        <SectionCard
          title="১৪ দিনের ডেলিভারি"
          right={<Link href="/portal/analytics" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase">সম্পূর্ণ অ্যানালিটিক্স →</Link>}
        >
          <AreaChart
            height={180}
            colors={["#5f8f0e", "#d2202c"]}
            labels={["ইম্প্রেশন", "ক্লিক ×২০"]}
            series={[
              { name: "ইম্প্রেশন", points: analytics.series.map((d) => ({ x: d.x, y: d.impressions })) },
              { name: "ক্লিক", points: analytics.series.map((d) => ({ x: d.x, y: d.clicks * 20 })) },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="আমার বুকিং"
            right={<Link href="/portal/bookings" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase">সব দেখুন →</Link>}
          >
            <div className="scroll-x">
              <table className="c-table">
                <thead>
                  <tr>
                    <th>রেফ</th><th>স্লট</th><th>মেয়াদ</th><th>স্ট্যাটাস</th>
                    <th className="text-right">ইম্প্রেশন</th><th className="text-right">ক্লিক</th><th className="text-right">মূল্য</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 7).map(({ b }) => {
                    const slot = SLOT_MAP[b.slotKey];
                    return (
                      <tr key={b.id}>
                        <td className="font-mono-x text-[11px] font-bold">{b.ref}</td>
                        <td>
                          <span className="font-serif-bn text-[13px] font-bold text-ink">{slot?.label ?? b.slotKey}</span>
                          <span className="block font-mono-x text-[9px] text-ink-soft uppercase">
                            {slot ? FORMAT_LABEL[slot.format] : ""}
                          </span>
                        </td>
                        <td className="font-mono-x text-[11px]">
                          {b.startsAt.toISOString().slice(0, 10)} → {b.endsAt.toISOString().slice(0, 10)}
                        </td>
                        <td><StatusPill s={b.status} /></td>
                        <td className="text-right font-mono-x">{b.impressions.toLocaleString()}</td>
                        <td className="text-right font-mono-x">{b.clicks.toLocaleString()}</td>
                        <td className="text-right"><Money v={b.totalBdt} /></td>
                        <td className="text-right">
                          {b.status === "pending_payment" ? (
                            <Link href={`/portal/pay/${b.id}`} className="c-btn px-2.5 py-1 text-[10.5px]">পে করুন</Link>
                          ) : (
                            <Link href="/portal/bookings" className="font-mono-x text-[10px] text-ink-soft uppercase">বিস্তারিত</Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="mt-6">
            <SectionCard title="সাম্প্রতিক পেমেন্ট" right={<Link href="/portal/payments" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase">সব →</Link>}>
              <div className="scroll-x">
                <table className="c-table">
                  <thead><tr><th>TRX</th><th>মাধ্যম</th><th>স্ট্যাটাস</th><th className="text-right">পরিমাণ</th><th>তারিখ</th></tr></thead>
                  <tbody>
                    {pays.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono-x text-[11px]">{p.trxId ?? "—"}</td>
                        <td className="text-[12px] font-bold uppercase">{p.method}</td>
                        <td><StatusPill s={p.status} /></td>
                        <td className="text-right"><Money v={p.amountBdt} /></td>
                        <td className="font-mono-x text-[11px]">{p.createdAt.toISOString().slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* live preview column */}
        <div className="space-y-6">
          <SectionCard title="এখন যা সাইটে দেখা যাচ্ছে">
            {live.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-ink-soft">কোনো চলমান বিজ্ঞাপন নেই।</p>
            ) : (
              <div className="space-y-5">
                {live.map(({ b, c }) => {
                  const tpl = TEMPLATE_MAP[c.templateId];
                  const slot = SLOT_MAP[b.slotKey];
                  if (!tpl || !slot) return null;
                  return (
                    <div key={b.id}>
                      <p className="mb-2 flex items-center justify-between font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
                        {slot.label}
                        <span className="text-lime">● LIVE</span>
                      </p>
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
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="দ্রুত সাহায্য">
            <ul className="space-y-2.5 text-[12.5px] text-ink-soft">
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-alizarin" />পেমেন্ট নিশ্চিত হলেই বিজ্ঞাপন স্বয়ংক্রিয়ভাবে লাইভ হয়।</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-alizarin" />বাংলায় লিখলেই ৫টি ভাষার সংস্করণ নিজে থেকে তৈরি হয়।</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-alizarin" />মেয়াদ শেষ হলে স্লট স্বয়ংক্রিয়ভাবে খালি হয়ে যায়।</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-alizarin" />সহায়তা: ads@hoichoi.example</li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </ConsoleShell>
  );
}

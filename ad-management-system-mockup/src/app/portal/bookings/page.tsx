import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, creatives } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV, StatusPill, Money, SectionCard } from "@/components/console/Shell";
import Creative from "@/components/ads/Creative";
import { SLOT_MAP, FORMAT_LABEL } from "@/lib/ads/slots";
import { TEMPLATE_MAP } from "@/lib/ads/templates";
import type { CreativeKind, PaletteKey } from "@/lib/ads/types";
import type { CreativeStyle } from "@/lib/ads/style";
import { isBlockLayout } from "@/lib/ads/blocks";

export const dynamic = "force-dynamic";

export default async function MyBookings({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const sp = await searchParams;
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, "tanvir@rang.example")).limit(1);

  const rows = await db
    .select({ b: bookings, c: creatives })
    .from(bookings)
    .innerJoin(creatives, eq(bookings.creativeId, creatives.id))
    .where(eq(bookings.advertiserId, me.id))
    .orderBy(desc(bookings.id));

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/bookings"
      title="আমার বুকিং"
      subtitle="প্রতিটি বুকিংয়ের অবস্থা, ডেলিভারি ও ক্রিয়েটিভ এক জায়গায়।"
      actions={<Link href="/portal/book" className="c-btn c-btn-lime">+ নতুন বুকিং</Link>}
    >
      {sp.paid ? (
        <div className="mb-5 border-2 border-lime bg-lime/10 px-4 py-3 text-[13px] font-bold text-ink">
          ✓ পেমেন্ট সফল — বুকিং <span className="font-mono-x">{sp.paid}</span> স্বয়ংক্রিয়ভাবে সক্রিয় হয়েছে।{" "}
          <Link href="/" className="underline">সাইটে দেখুন →</Link>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {rows.map(({ b, c }) => {
          const slot = SLOT_MAP[b.slotKey];
          const tpl = TEMPLATE_MAP[c.templateId];
          const ctr = b.impressions ? ((b.clicks / b.impressions) * 100).toFixed(2) : "0.00";
          return (
            <article key={b.id} className="c-card">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/12 px-4 py-3">
                <div>
                  <p className="font-mono-x text-[11px] font-bold text-ink">{b.ref}</p>
                  <p className="font-serif-bn text-[15px] font-black text-ink">{slot?.label ?? b.slotKey}</p>
                </div>
                <div className="flex items-center gap-2">
                  {b.manual ? <span className="c-pill st-draft">ম্যানুয়াল</span> : null}
                  <StatusPill s={b.status} />
                </div>
              </header>

              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
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
                  <p className="mt-2 font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">
                    {tpl?.nameBn} · {slot ? FORMAT_LABEL[slot.format] : ""}
                  </p>
                </div>

                <dl className="space-y-1.5 text-[12px]">
                  {[
                    ["মেয়াদ", `${b.startsAt.toISOString().slice(0, 10)} → ${b.endsAt.toISOString().slice(0, 10)}`],
                    ["দিন", String(b.days)],
                    ["ইম্প্রেশন", b.impressions.toLocaleString()],
                    ["ক্লিক", `${b.clicks.toLocaleString()} (CTR ${ctr}%)`],
                    ["অগ্রাধিকার", String(b.priority)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-ink/10 pb-1">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="font-mono-x text-ink">{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 text-[14px] font-black">
                    <dt>মোট</dt>
                    <dd><Money v={b.totalBdt} /></dd>
                  </div>
                  {b.status === "pending_payment" ? (
                    <Link href={`/portal/pay/${b.id}`} className="c-btn c-btn-lime mt-2 w-full">
                      পেমেন্ট সম্পূর্ণ করুন
                    </Link>
                  ) : null}
                </dl>
              </div>
            </article>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <SectionCard title="কোনো বুকিং নেই">
          <p className="text-[13px] text-ink-soft">প্রথম বিজ্ঞাপন বুক করে শুরু করুন।</p>
        </SectionCard>
      ) : null}
    </ConsoleShell>
  );
}

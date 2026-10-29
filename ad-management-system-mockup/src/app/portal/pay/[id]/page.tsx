import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, creatives } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV, Money } from "@/components/console/Shell";
import Creative from "@/components/ads/Creative";
import { SLOT_MAP, FORMAT_LABEL } from "@/lib/ads/slots";
import { TEMPLATE_MAP } from "@/lib/ads/templates";
import { payBooking } from "@/lib/ads/actions";
import type { CreativeKind, PaletteKey } from "@/lib/ads/types";
import type { CreativeStyle } from "@/lib/ads/style";
import { isBlockLayout } from "@/lib/ads/blocks";

export const dynamic = "force-dynamic";

const METHODS = [
  { k: "bkash", n: "বিকাশ", d: "আপনার bKash নম্বর দিন — OTP আসবে", c: "#e2136e", ph: "01XXXXXXXXX" },
  { k: "nagad", n: "নগদ", d: "নগদ অ্যাকাউন্ট নম্বর", c: "#f6921e", ph: "01XXXXXXXXX" },
  { k: "rocket", n: "রকেট", d: "রকেট অ্যাকাউন্ট নম্বর", c: "#8c3494", ph: "01XXXXXXXXX-X" },
  { k: "card", n: "কার্ড", d: "Visa · Mastercard · Amex", c: "#1a1f71", ph: "4111 1111 1111 1111" },
  { k: "paypal", n: "PayPal", d: "PayPal ইমেইল", c: "#003087", ph: "you@example.com" },
  { k: "crypto", n: "ক্রিপ্টো", d: "USDT (TRC20) ওয়ালেট", c: "#f7931a", ph: "T…" },
  { k: "bank", n: "ব্যাংক", d: "EFT / RTGS রেফারেন্স", c: "#0d9488", ph: "Ref no." },
];

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const method = sp.m && METHODS.some((m) => m.k === sp.m) ? sp.m : "bkash";
  const sel = METHODS.find((m) => m.k === method)!;

  const [row] = await db
    .select({ b: bookings, c: creatives })
    .from(bookings)
    .innerJoin(creatives, eq(bookings.creativeId, creatives.id))
    .where(eq(bookings.id, Number(id)))
    .limit(1);

  if (!row) notFound();
  const slot = SLOT_MAP[row.b.slotKey];
  const tpl = TEMPLATE_MAP[row.c.templateId];

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/book"
      title="পেমেন্ট"
      subtitle={`বুকিং ${row.b.ref} · ${slot?.label} · ${row.b.days} দিন`}
      actions={<Link href="/portal/bookings" className="c-btn c-btn-ghost">পরে করব</Link>}
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* method picker */}
        <div className="lg:col-span-7">
          <section className="c-card">
            <header className="border-b border-ink/12 px-4 py-3">
              <h2 className="font-serif-bn text-[17px] font-black text-ink">পেমেন্ট মাধ্যম বাছুন</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">যেটিই বাছুন, নিষ্পত্তি হলেই বিজ্ঞাপন স্বয়ংক্রিয়ভাবে লাইভ হবে।</p>
            </header>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {METHODS.map((m) => (
                <Link
                  key={m.k}
                  href={`/portal/pay/${id}?m=${m.k}`}
                  className={`flex items-center gap-3 border p-3 transition-colors ${
                    m.k === method ? "border-ink bg-ink text-paper" : "border-ink/18 hover:border-ink"
                  }`}
                >
                  <span className="h-8 w-1.5" style={{ background: m.c }} />
                  <span>
                    <span className="block font-serif-bn text-[14px] font-bold">{m.n}</span>
                    <span className={`block text-[10.5px] ${m.k === method ? "text-paper/55" : "text-ink-soft"}`}>{m.d}</span>
                  </span>
                </Link>
              ))}
            </div>

            <form action={payBooking} className="border-t border-ink/12 p-4">
              <input type="hidden" name="bookingId" value={row.b.id} />
              <input type="hidden" name="method" value={method} />
              <label className="c-label">{sel.n} — {sel.d}</label>
              <input className="c-input mt-1.5" name="payerRef" placeholder={sel.ph} required />

              {method === "crypto" ? (
                <div className="mt-3 border border-ink/20 bg-paper-deep/40 p-3 font-mono-x text-[11px] break-all text-ink-soft">
                  USDT (TRC20): TXk9hoichoiDEMOwallet00000000000000
                  <span className="mt-1 block text-[10px]">নেটওয়ার্ক ফি আপনার, ১ কনফার্মেশনেই নিষ্পত্তি।</span>
                </div>
              ) : null}
              {method === "bank" ? (
                <div className="mt-3 border border-ink/20 bg-paper-deep/40 p-3 text-[11.5px] text-ink-soft">
                  হৈচৈ মিডিয়া · ব্র্যাক ব্যাংক · A/C 1501XXXXXXXX · গুলশান শাখা
                </div>
              ) : null}

              <button type="submit" className="c-btn c-btn-lime mt-4 w-full py-3">
                ৳{row.b.totalBdt.toLocaleString()} পরিশোধ করুন
              </button>
              <p className="mt-2 text-center text-[10.5px] text-ink-soft">
                স্যান্ডবক্স গেটওয়ে — প্রোডাকশনে bKash/Nagad/Stripe/PayPal/Coinbase API যুক্ত হবে।
              </p>
            </form>
          </section>
        </div>

        {/* summary */}
        <div className="space-y-6 lg:col-span-5">
          <section className="c-card">
            <header className="border-b border-ink/12 px-4 py-3">
              <h2 className="font-serif-bn text-[17px] font-black text-ink">অর্ডার সারাংশ</h2>
            </header>
            <div className="p-4">
              <dl className="space-y-2 text-[12.5px]">
                {[
                  ["বুকিং রেফ", row.b.ref],
                  ["স্লট", slot?.label ?? row.b.slotKey],
                  ["ফরম্যাট", slot ? `${FORMAT_LABEL[slot.format]} · ${slot.size}` : "—"],
                  ["টেমপ্লেট", tpl?.nameBn ?? row.c.templateId],
                  ["শুরু", row.b.startsAt.toISOString().slice(0, 10)],
                  ["শেষ", row.b.endsAt.toISOString().slice(0, 10)],
                  ["মেয়াদ", `${row.b.days} দিন`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-ink/10 pb-1.5">
                    <dt className="text-ink-soft">{k}</dt>
                    <dd className="font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <dl className="mt-4 space-y-1.5 text-[12.5px]">
                <div className="flex justify-between"><dt className="text-ink-soft">সাবটোটাল</dt><dd><Money v={row.b.grossBdt} /></dd></div>
                <div className="flex justify-between text-lime"><dt>ছাড়</dt><dd className="font-mono-x">−৳{row.b.discountBdt.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">ভ্যাট</dt><dd><Money v={row.b.vatBdt} /></dd></div>
                <div className="flex justify-between border-t border-ink/20 pt-2 text-[16px] font-black"><dt>সর্বমোট</dt><dd><Money v={row.b.totalBdt} /></dd></div>
              </dl>
            </div>
          </section>

          {tpl && slot ? (
            <section className="c-card">
              <header className="border-b border-ink/12 px-4 py-3">
                <h2 className="font-serif-bn text-[17px] font-black text-ink">যা প্রকাশ পাবে</h2>
              </header>
              <div className="bg-paper-deep/40 p-3">
                <Creative
                  kind={tpl.kind as CreativeKind}
                  palette={row.c.palette as PaletteKey}
                  data={{ ...tpl.data, ...(row.c.data as object) }}
                  format={slot.format}
                  style={row.c.style as CreativeStyle}
                  layout={isBlockLayout(row.c.layout) ? row.c.layout : null}
                />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </ConsoleShell>
  );
}

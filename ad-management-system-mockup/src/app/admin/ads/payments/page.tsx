import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, payments } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV, StatusPill, Money, Stat, SectionCard } from "@/components/console/Shell";
import { SLOT_MAP } from "@/lib/ads/slots";
import { adminMarkPaid } from "@/lib/ads/actions";

export const dynamic = "force-dynamic";

const METHOD_BN: Record<string, { n: string; c: string }> = {
  bkash: { n: "বিকাশ", c: "#e2136e" },
  nagad: { n: "নগদ", c: "#f6921e" },
  rocket: { n: "রকেট", c: "#8c3494" },
  card: { n: "কার্ড", c: "#1a1f71" },
  paypal: { n: "PayPal", c: "#003087" },
  crypto: { n: "ক্রিপ্টো", c: "#f7931a" },
  bank: { n: "ব্যাংক", c: "#0d9488" },
  manual: { n: "ম্যানুয়াল", c: "#6b6250" },
};

export default async function AdminPayments() {
  const rows = await db
    .select({ p: payments, a: advertisers, b: bookings })
    .from(payments)
    .innerJoin(advertisers, eq(payments.advertiserId, advertisers.id))
    .leftJoin(bookings, eq(payments.bookingId, bookings.id))
    .orderBy(desc(payments.id));

  const paid = rows.filter((r) => r.p.status === "paid");
  const open = rows.filter((r) => r.p.status === "initiated");
  const total = paid.reduce((s, r) => s + r.p.amountBdt, 0);
  const due = open.reduce((s, r) => s + r.p.amountBdt, 0);

  const byMethod = Object.keys(METHOD_BN).map((m) => ({
    m,
    n: paid.filter((r) => r.p.method === m).length,
    v: paid.filter((r) => r.p.method === m).reduce((s, r) => s + r.p.amountBdt, 0),
  }));
  const maxV = Math.max(1, ...byMethod.map((x) => x.v));

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/payments"
      title="পেমেন্ট ও রাজস্ব"
      subtitle="গেটওয়ে থেকে আসা সব লেনদেন স্বয়ংক্রিয়ভাবে নথিভুক্ত। নগদ/ব্যাংক পেমেন্ট অ্যাডমিন হাতে নিষ্পত্তি করতে পারেন।"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="মোট আদায়" value={`৳${total.toLocaleString()}`} sub={`${paid.length} টি লেনদেন`} accent="#037c1b" />
        <Stat label="বকেয়া" value={`৳${due.toLocaleString()}`} sub={`${open.length} টি অপেক্ষমাণ`} accent="#b45309" />
        <Stat label="গড় অর্ডার" value={`৳${paid.length ? Math.round(total / paid.length).toLocaleString() : 0}`} accent="#2563eb" />
        <Stat label="সক্রিয় মাধ্যম" value={String(byMethod.filter((b) => b.n > 0).length)} sub="৮টির মধ্যে" accent="#d2202c" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="লেনদেন">
            <div className="scroll-x">
              <table className="c-table">
                <thead>
                  <tr><th>TRX</th><th>ক্লায়েন্ট</th><th>বুকিং</th><th>স্লট</th><th>মাধ্যম</th><th>স্ট্যাটাস</th><th className="text-right">পরিমাণ</th><th>তারিখ</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map(({ p, a, b }) => (
                    <tr key={p.id}>
                      <td className="font-mono-x text-[11px]">{p.trxId ?? "—"}</td>
                      <td className="text-[12px]">{a.company ?? a.name}</td>
                      <td className="font-mono-x text-[11px] font-bold">{b?.ref ?? "—"}</td>
                      <td className="text-[12px]">{b ? SLOT_MAP[b.slotKey]?.label ?? b.slotKey : "—"}</td>
                      <td>
                        <span className="flex items-center gap-1.5 text-[12px] font-bold">
                          <span className="h-3 w-1.5" style={{ background: METHOD_BN[p.method]?.c ?? "#6b6250" }} />
                          {METHOD_BN[p.method]?.n ?? p.method}
                        </span>
                      </td>
                      <td><StatusPill s={p.status} /></td>
                      <td className="text-right"><Money v={p.amountBdt} /></td>
                      <td className="font-mono-x text-[11px]">{p.createdAt.toISOString().slice(0, 10)}</td>
                      <td className="text-right">
                        {p.status === "initiated" ? (
                          <form action={adminMarkPaid}>
                            <input type="hidden" name="paymentId" value={p.id} />
                            <button className="c-btn px-2.5 py-1 text-[10.5px]">হাতে নিষ্পত্তি</button>
                          </form>
                        ) : (
                          <span className="font-mono-x text-[10px] text-ink-soft uppercase">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="মাধ্যম অনুযায়ী আদায়">
            <div className="space-y-3">
              {byMethod.map((x) => (
                <div key={x.m}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3" style={{ background: METHOD_BN[x.m].c }} />
                      {METHOD_BN[x.m].n}
                    </span>
                    <span className="font-mono-x font-bold">৳{x.v.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-ink/10">
                    <div className="h-full" style={{ width: `${(x.v / maxV) * 100}%`, background: METHOD_BN[x.m].c }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="গেটওয়ে কনফিগারেশন">
            <ul className="space-y-2 text-[12px] text-ink-soft">
              <li className="flex justify-between border-b border-ink/10 pb-1.5"><span>bKash Checkout</span><span className="c-pill st-pending">SANDBOX</span></li>
              <li className="flex justify-between border-b border-ink/10 pb-1.5"><span>Nagad PGW</span><span className="c-pill st-pending">SANDBOX</span></li>
              <li className="flex justify-between border-b border-ink/10 pb-1.5"><span>Stripe / Card</span><span className="c-pill st-pending">SANDBOX</span></li>
              <li className="flex justify-between border-b border-ink/10 pb-1.5"><span>PayPal REST</span><span className="c-pill st-pending">SANDBOX</span></li>
              <li className="flex justify-between border-b border-ink/10 pb-1.5"><span>Coinbase Commerce</span><span className="c-pill st-pending">SANDBOX</span></li>
              <li className="flex justify-between"><span>Bank EFT</span><span className="c-pill st-active">MANUAL</span></li>
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
              প্রোডাকশনে কী যোগ করতে হবে: <span className="font-mono-x">BKASH_APP_KEY</span>,{" "}
              <span className="font-mono-x">NAGAD_MERCHANT_ID</span>, <span className="font-mono-x">STRIPE_SECRET_KEY</span>,{" "}
              <span className="font-mono-x">PAYPAL_CLIENT_ID</span>, <span className="font-mono-x">COINBASE_API_KEY</span> — সবই
              সার্ভার-সাইড env থেকে পড়া হয়।
            </p>
          </SectionCard>
        </div>
      </div>
    </ConsoleShell>
  );
}

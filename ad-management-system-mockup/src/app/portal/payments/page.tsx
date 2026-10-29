import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, payments } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV, StatusPill, Money, Stat, SectionCard } from "@/components/console/Shell";
import { SLOT_MAP } from "@/lib/ads/slots";

export const dynamic = "force-dynamic";

const METHOD_BN: Record<string, string> = {
  bkash: "বিকাশ",
  nagad: "নগদ",
  rocket: "রকেট",
  card: "কার্ড",
  paypal: "PayPal",
  crypto: "ক্রিপ্টো",
  bank: "ব্যাংক",
  manual: "ম্যানুয়াল",
};

export default async function MyPayments() {
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, "tanvir@rang.example")).limit(1);

  const rows = await db
    .select({ p: payments, b: bookings })
    .from(payments)
    .leftJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(eq(payments.advertiserId, me.id))
    .orderBy(desc(payments.id));

  const paid = rows.filter((r) => r.p.status === "paid");
  const due = rows.filter((r) => r.p.status === "initiated");
  const total = paid.reduce((s, r) => s + r.p.amountBdt, 0);
  const dueTotal = due.reduce((s, r) => s + r.p.amountBdt, 0);

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/payments"
      title="পেমেন্ট ও ইনভয়েস"
      subtitle="সব লেনদেনের রেকর্ড — প্রতিটি ইনভয়েস ডাউনলোডযোগ্য।"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="পরিশোধিত" value={`৳${total.toLocaleString()}`} sub={`${paid.length} টি ইনভয়েস`} />
        <Stat label="বকেয়া" value={`৳${dueTotal.toLocaleString()}`} sub={`${due.length} টি অপেক্ষমাণ`} accent="#b45309" />
        <Stat label="ক্রেডিট ব্যালান্স" value={`৳${me.creditBdt.toLocaleString()}`} sub="পরবর্তী বুকিংয়ে ব্যবহার" accent="#2563eb" />
        <Stat label="সক্রিয় মাধ্যম" value="৭" sub="বিকাশ · নগদ · কার্ড · PayPal · ক্রিপ্টো…" accent="#d2202c" />
      </div>

      <div className="mt-6">
        <SectionCard title="লেনদেনের ইতিহাস">
          <div className="scroll-x">
            <table className="c-table">
              <thead>
                <tr>
                  <th>TRX</th><th>বুকিং</th><th>স্লট</th><th>মাধ্যম</th>
                  <th>পেয়ার</th><th>স্ট্যাটাস</th><th className="text-right">পরিমাণ</th><th>তারিখ</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, b }) => (
                  <tr key={p.id}>
                    <td className="font-mono-x text-[11px]">{p.trxId ?? "—"}</td>
                    <td className="font-mono-x text-[11px] font-bold">{b?.ref ?? "—"}</td>
                    <td className="text-[12px]">{b ? SLOT_MAP[b.slotKey]?.label ?? b.slotKey : "—"}</td>
                    <td className="text-[12px] font-bold">{METHOD_BN[p.method] ?? p.method}</td>
                    <td className="font-mono-x text-[11px] text-ink-soft">{p.payerRef ?? "—"}</td>
                    <td><StatusPill s={p.status} /></td>
                    <td className="text-right"><Money v={p.amountBdt} /></td>
                    <td className="font-mono-x text-[11px]">{p.createdAt.toISOString().slice(0, 10)}</td>
                    <td className="text-right">
                      {p.status === "initiated" && p.bookingId ? (
                        <Link href={`/portal/pay/${p.bookingId}`} className="c-btn px-2.5 py-1 text-[10.5px]">পে করুন</Link>
                      ) : (
                        <span className="font-mono-x text-[10px] text-ink-soft uppercase">ইনভয়েস</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </ConsoleShell>
  );
}

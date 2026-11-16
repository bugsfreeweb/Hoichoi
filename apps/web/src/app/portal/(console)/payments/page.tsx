import { invoiceBalance, listInvoices, listPaymentsForClient } from "@hoichoi/db";
import { requireAdClient } from "@/lib/ad-client-auth";

export const dynamic = "force-dynamic";

/**
 * The advertiser's own invoices.
 *
 * Scoped by `client.id` — the readers take a required id, so this page cannot
 * show anyone else's money even if it were edited carelessly. There is still no
 * payment gateway: an invoice is unpaid until an operator records the money, and
 * the copy says so rather than implying an online checkout exists.
 */
export default async function AdClientPaymentsPage() {
  const client = await requireAdClient();
  const [invoices, balance, payments] = await Promise.all([
    listInvoices(client.id),
    invoiceBalance(client.id),
    listPaymentsForClient(client.id),
  ]);

  const paidByInvoice = new Map<string, Array<{ amountBdt: number; method: string; reference: string | null; receivedAt: string }>>();
  for (const payment of payments) {
    const list = paidByInvoice.get(payment.invoiceId) ?? [];
    list.push(payment);
    paidByInvoice.set(payment.invoiceId, list);
  }

  const STATUS_BN: Record<string, string> = { issued: "অপরিশোধিত", paid: "পরিশোধিত", void: "শূন্য" };

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">BILLING</p>
        <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">ইনভয়েস ও পেমেন্ট</h1>
        <p className="mt-1 text-[12px] text-ink-soft">
          আপনার ইনভয়েস, পরিশোধিত অর্থ এবং বাকি — সব শুধু আপনার অ্যাকাউন্টের।
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "মোট ইনভয়েস", value: balance.issued },
          { label: "পরিশোধিত", value: balance.paid },
          { label: "বাকি", value: balance.open },
        ].map((stat) => (
          <div key={stat.label} className="border border-ink/15 bg-card p-4">
            <p className="font-mono-x text-[9px] tracking-[0.16em] text-ink-soft uppercase">{stat.label}</p>
            <p className="mt-1 font-display text-[22px] font-bold text-ink">৳{stat.value.toLocaleString("en-US")}</p>
          </div>
        ))}
      </div>

      <div className="border border-amberx/30 bg-amberx/5 p-4 text-[11px] leading-relaxed text-ink">
        এই সাইটে এখনো কোনো payment gateway যুক্ত নেই। ইনভয়েস তৈরি হয় ডেস্ক থেকে, আর &ldquo;পরিশোধিত&rdquo;
        দেখায় তখনই যখন ডেস্ক আপনার পাঠানো টাকা হাতে পেয়ে নথিভুক্ত করে। কোনো অনলাইন চেকআউট নেই।
      </div>

      {invoices.length === 0 ? (
        <section className="border border-ink/15 bg-card p-5">
          <p className="text-[12px] text-ink-soft">এখনো কোনো ইনভয়েস তৈরি হয়নি। বুকিং অনুমোদনের পরে ডেস্ক ইনভয়েস তৈরি করবে।</p>
        </section>
      ) : (
        <section className="border border-ink/15 bg-card p-4">
          <div className="divide-y divide-ink/10">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-mono-x text-[11px] font-bold text-ink">{invoice.invoiceNo}</p>
                    <p className="mt-0.5 text-[10.5px] text-ink-soft">
                      ইস্যু {invoice.issuedAt.slice(0, 10)}
                      {invoice.dueAt ? ` · পরিশোধের শেষ ${invoice.dueAt.slice(0, 10)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-[16px] font-bold text-ink">৳{invoice.totalBdt.toLocaleString("en-US")}</p>
                    <p className="font-mono-x text-[9.5px] tracking-wide text-ink-soft uppercase">
                      {STATUS_BN[invoice.status] ?? invoice.status} · পরিশোধিত ৳{invoice.paidBdt.toLocaleString("en-US")}
                    </p>
                  </div>
                </div>
                {invoice.voidReason && <p className="mt-1 text-[10.5px] text-ink-soft">কারণ: {invoice.voidReason}</p>}
                {(paidByInvoice.get(invoice.id) ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {(paidByInvoice.get(invoice.id) ?? []).map((payment) => (
                      <li key={`${payment.receivedAt}-${payment.amountBdt}`} className="font-mono-x text-[10px] text-ink-soft">
                        ৳{payment.amountBdt.toLocaleString("en-US")} · {payment.method} · {payment.receivedAt.slice(0, 10)}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
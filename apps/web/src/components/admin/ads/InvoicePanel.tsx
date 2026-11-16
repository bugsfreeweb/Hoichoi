"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAction } from "@/lib/admin-api";
import { useToast } from "@/components/admin/ui/toast";

/**
 * Manual invoices, on the ads console.
 *
 * Issue against an accepted booking, record what actually arrived, void with a
 * reason. The panel never says "paid" because a button was pressed — the status
 * comes back from the server, which derives it from the recorded payments.
 */

export interface InvoiceRow {
  id: string;
  invoiceNo: string;
  clientId: string;
  bookingId: string | null;
  status: "issued" | "paid" | "void";
  issuedAt: string;
  dueAt: string | null;
  subtotalBdt: number;
  vatBdt: number;
  totalBdt: number;
  paidBdt: number;
  voidReason: string | null;
}

export interface BookingOption {
  id: string;
  clientId: string;
  slotKey: string;
  totalBdt: number;
  startsAt: string;
}

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "ব্যাংক ট্রান্সফার",
  bkash: "বিকাশ",
  nagad: "নগদ",
  cash: "নগদ নগদ",
  cheque: "চেক",
  other: "অন্যান্য",
};

const STATUS_LABEL: Record<string, string> = { issued: "অপরিশোধিত", paid: "পরিশোধিত", void: "শূন্য" };

export function InvoicePanel({
  invoices,
  bookings,
  clients,
}: {
  invoices: InvoiceRow[];
  bookings: BookingOption[];
  clients: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const run = useAdminAction();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issueBooking, setIssueBooking] = useState("");
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payRef, setPayRef] = useState("");

  const invoicedBookingIds = new Set(invoices.filter((i) => i.status !== "void" && i.bookingId).map((i) => i.bookingId));
  const issuable = bookings.filter((b) => !invoicedBookingIds.has(b.id));

  async function call(payload: Record<string, unknown>, key: string, busyText: string, successText: string): Promise<void> {
    setBusy(key);
    setError(null);
    try {
      const data = await run<{ ok: boolean; invoice?: InvoiceRow }>({
        path: "/api/admin/ads/invoices",
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
        busy: busyText,
        success: successText,
        detail: (result) => (result.invoice ? result.invoice.invoiceNo : undefined),
      });
      if (data?.invoice) {
        router.refresh();
        setPayFor(null);
        setPayAmount("");
        setPayRef("");
      }
    } finally {
      setBusy(null);
    }
  }

  async function issue(): Promise<void> {
    const booking = issuable.find((b) => b.id === issueBooking);
    if (!booking) {
      setError("একটি বুকিং বেছে নিন।");
      return;
    }
    await call(
      { action: "issue", clientId: booking.clientId, bookingId: booking.id, subtotalBdt: booking.totalBdt },
      "issue",
      "ইনভয়েস তৈরি হচ্ছে…",
      "ইনভয়েস তৈরি হয়েছে",
    );
    setIssueBooking("");
  }

  function nameOf(clientId: string): string {
    return clients.find((c) => c.id === clientId)?.name ?? clientId.slice(0, 8);
  }

  return (
    <section className="mt-6 border border-ink/20 bg-paper-deep p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif-bn text-[17px] font-bold text-ink">ইনভয়েস ও পেমেন্ট</h2>
          <p className="mt-1 text-[11px] text-ink-soft">
            গেটওয়ে নেই — টাকা তখনই দেখায় যখন আপনি হাতে নথিভুক্ত করেন। কোনো বাটনে চাপ দিলেই &ldquo;পরিশোধিত&rdquo; হবে না।
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">
            বুকিং
            <select
              className="mt-1 block min-w-[220px] border border-ink/25 bg-paper px-2 py-1.5 text-[11.5px] font-normal normal-case text-ink"
              value={issueBooking}
              onChange={(e) => setIssueBooking(e.target.value)}
            >
              <option value="">— বেছে নিন —</option>
              {issuable.map((b) => (
                <option key={b.id} value={b.id}>
                  {nameOf(b.clientId)} · {b.slotKey} · ৳{b.totalBdt} · {b.startsAt.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="border border-ink/40 px-3 py-1.5 text-[11.5px] font-bold text-ink transition hover:bg-lime disabled:opacity-40"
            disabled={busy !== null || !issueBooking}
            onClick={() => void issue()}
          >
            {busy === "issue" ? "…" : "ইনভয়েস তৈরি"}
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-3 border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">
          ✕ {error}
        </p>
      )}

      {invoices.length === 0 ? (
        <p className="mt-4 text-[12px] text-ink-soft">এখনো কোনো ইনভয়েস নেই।</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[11.5px]">
            <thead>
              <tr className="border-b border-ink/20 font-mono-x text-[9.5px] tracking-wide text-ink-soft uppercase">
                <th className="py-2 pr-3">নম্বর</th>
                <th className="py-2 pr-3">ক্লায়েন্ট</th>
                <th className="py-2 pr-3">মোট</th>
                <th className="py-2 pr-3">পরিশোধিত</th>
                <th className="py-2 pr-3">অবস্থা</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="align-top">
                  <td className="py-2 pr-3 font-mono-x">{invoice.invoiceNo}</td>
                  <td className="py-2 pr-3">{nameOf(invoice.clientId)}</td>
                  <td className="py-2 pr-3">৳{invoice.totalBdt}</td>
                  <td className="py-2 pr-3">৳{invoice.paidBdt}</td>
                  <td className="py-2 pr-3">
                    <span className="font-mono-x text-[9.5px] tracking-wide uppercase">
                      {STATUS_LABEL[invoice.status] ?? invoice.status}
                    </span>
                    {invoice.voidReason && <p className="mt-1 text-[10px] text-ink-soft">{invoice.voidReason}</p>}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {invoice.status === "issued" && (
                      <>
                        <button
                          type="button"
                          className="border border-ink/30 px-2 py-1 text-[10.5px] font-bold hover:bg-lime disabled:opacity-40"
                          disabled={busy !== null}
                          onClick={() => {
                            setPayFor(invoice.id);
                            setPayAmount(String(invoice.totalBdt - invoice.paidBdt));
                          }}
                        >
                          পেমেন্ট
                        </button>
                        <button
                          type="button"
                          className="ml-1 border border-alizarin/50 px-2 py-1 text-[10.5px] font-bold text-alizarin hover:bg-alizarin/10 disabled:opacity-40"
                          disabled={busy !== null}
                          onClick={() => {
                            const reason = window.prompt("শূন্য করার কারণ (কমপক্ষে ৫ অক্ষর)") ?? "";
                            if (reason.trim().length < 5) {
                              toast.error("कारण दরকার", "কমপক্ষে ৫ অক্ষরের কারণ লিখুন।");
                              return;
                            }
                            void call(
                              { action: "void", invoiceId: invoice.id, reason },
                              `void-${invoice.id}`,
                              "ইনভয়েস শূন্য করা হচ্ছে…",
                              "ইনভয়েস শূন্য হয়েছে",
                            );
                          }}
                        >
                          শূন্য
                        </button>
                      </>
                    )}
                    {invoice.bookingId && (
                      <span className="ml-2 font-mono-x text-[9px] text-ink-soft">booking {invoice.bookingId.slice(0, 8)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payFor && (
        <div className="mt-4 border border-ink/25 bg-paper p-4">
          <p className="font-mono-x text-[10px] tracking-wide text-ink-soft uppercase">পেমেন্ট নথিভুক্ত করুন</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-[10px] font-bold text-ink-soft uppercase">
              টাকা
              <input
                className="mt-1 block w-28 border border-ink/25 bg-paper px-2 py-1.5 text-[11.5px] text-ink"
                inputMode="numeric"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label className="text-[10px] font-bold text-ink-soft uppercase">
              মাধ্যম
              <select
                className="mt-1 block border border-ink/25 bg-paper px-2 py-1.5 text-[11.5px] text-ink"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                {Object.entries(METHOD_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-bold text-ink-soft uppercase">
              রেফারেন্স (ঐচ্ছিক)
              <input
                className="mt-1 block w-44 border border-ink/25 bg-paper px-2 py-1.5 text-[11.5px] text-ink"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="TRX / bKash TrxID"
              />
            </label>
            <button
              type="button"
              className="border border-ink/40 px-3 py-1.5 text-[11.5px] font-bold text-ink transition hover:bg-lime disabled:opacity-40"
              disabled={busy !== null || !payAmount}
              onClick={() =>
                void call(
                  { action: "payment", invoiceId: payFor, amountBdt: Number(payAmount), method: payMethod, reference: payRef },
                  `pay-${payFor}`,
                  "পেমেন্ট নথিভুক্ত হচ্ছে…",
                  "পেমেন্ট নথিভুক্ত হয়েছে",
                )
              }
            >
              {busy?.startsWith("pay-") ? "…" : "নথিভুক্ত"}
            </button>
            <button
              type="button"
              className="px-2 py-1.5 text-[11px] font-bold text-ink-soft hover:text-ink"
              onClick={() => setPayFor(null)}
            >
              বাতিল
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

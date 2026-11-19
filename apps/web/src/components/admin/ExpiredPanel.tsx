"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toBn } from "@/lib/format";

/**
 * "Delete everything older than N days" — an operator decision, made once.
 *
 * The page states the number before the button and the button repeats it in its
 * own confirmation, because this is the only control in the console that removes
 * many rows at once. A legal hold and a live missing-children case are never
 * touched (the server applies both guards and reports what it skipped), so the
 * promise made here is the promise the endpoint keeps.
 */
export function ExpiredPanel({
  retentionDays,
  expiredCount,
}: {
  retentionDays: number;
  expiredCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!expiredCount) return;
    const ok = confirm(
      `${toBn(retentionDays)} দিনের বেশি পুরনো ${toBn(expiredCount)}টি পোস্ট স্থায়ীভাবে মুছে যাবে। legal hold ও সক্রিয় নিখোঁজ মামলা বাদ যাবে। নিশ্চিত?`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/archive/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ olderThanDays: retentionDays }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        skippedLegalHold?: number;
        skippedActiveCase?: number;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const skipped = (data.skippedLegalHold ?? 0) + (data.skippedActiveCase ?? 0);
      setResult(
        `${toBn(data.deleted ?? 0)}টি মুছে ফেলা হয়েছে` +
          (skipped ? ` · ${toBn(skipped)}টি আইনি/মামলা সুরক্ষায় রাখা হয়েছে` : ""),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "মুছতে পারিনি");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border border-alizarin/40 bg-alizarin/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-alizarin">
            মেয়াদোত্তীর্ণ · {toBn(retentionDays)} দিনের বেশি পুরনো
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            এখন {toBn(expiredCount)}টি পোস্ট আছে যেগুলো {toBn(retentionDays)} দিনের বেশি পুরনো — archived
            হোক বা না হোক। এগুলো মুছে ফেলা হলে ফেরানো যাবে না (deletion ledger-এ রেকর্ড থাকবে)।
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || expiredCount === 0}
          className="border-2 border-alizarin bg-alizarin px-4 py-2 text-[12.5px] font-bold text-on-accent transition hover:bg-alizarin/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "মোছা হচ্ছে…"
            : expiredCount === 0
              ? "মুছে ফেলার কিছু নেই"
              : `${toBn(retentionDays)} দিনের পুরনো সব মুছুন`}
        </button>
      </div>
      {result && <p className="mt-2 text-[12px] font-bold text-cat-teal">✓ {result}</p>}
      {error && <p className="mt-2 text-[12px] font-bold text-alizarin">✗ {error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import { useAdminAction } from "@/lib/admin-api";

interface ReconcileItem {
  kind: string;
  rel: string;
  detail: string;
}

interface ReconcileReport {
  scannedLocalFiles: number;
  referencedPaths: number;
  remoteRows: number;
  items: ReconcileItem[];
  deletedLocal: string[];
  deletedRemoteRows: number;
  byClass: Record<string, number>;
}

const CLASS_LABEL: Record<string, string> = {
  unreferenced_local: "অব্যহৃত লোকাল ফাইল",
  missing_local: "হারানো মিডিয়া",
  duplicate_remote_row: "ডুপ্লিকেট রিমোট রেকর্ড",
  remote_row_without_post: "পোস্টহীন রিমোট রেকর্ড",
};

/**
 * Media reconciliation control.
 *
 * The scan runs server-side against the real media tree and the real registry, so
 * the numbers are what the disk holds. "Scan" changes nothing; "Clean" only
 * removes files nobody references and records that no post needs, and the result
 * comes back here instead of being buried in a toast.
 */
export function MediaReconcilePanel() {
  const run = useAdminAction();
  const [busy, setBusy] = useState<null | "scan" | "clean">(null);
  const [report, setReport] = useState<ReconcileReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function scan(dryRun: boolean) {
    setBusy(dryRun ? "scan" : "clean");
    setError(null);
    const data = await run<{ ok: boolean; report: ReconcileReport }>({
      path: "/api/admin/media/reconcile",
      init: { method: dryRun ? "GET" : "POST" },
      busy: dryRun ? "মিডিয়া স্ক্যান চলছে…" : "অব্যহৃত মিডিয়া মোছা হচ্ছে…",
      success: dryRun ? "✓ স্ক্যান সম্পন্ন" : "✓ পরিষ্কার সম্পন্ন",
    });
    setBusy(null);
    if (data?.report) setReport(data.report);
    else setError("স্ক্যান সম্পন্ন হয়নি — কিছুক্ষণ পরে আবার চেষ্টা করুন।");
  }

  const total = report ? Object.values(report.byClass).reduce((a, b) => a + b, 0) : 0;

  return (
    <section className="mt-8 border border-ink/20 bg-paper-deep p-5">
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
        MEDIA RECONCILIATION
      </p>
      <h2 className="mt-1 font-sans-bn text-[17px] font-bold text-ink">মিডিয়া মিলিয়ে দেখা</h2>
      <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-soft">
        ডিস্কে থাকা ফাইল, পোস্টের মিডিয়া-পাথ আর রিমোট রেকর্ড — তিনটাই মিলিয়ে দেখা হয়। স্ক্যান কিছু
        বদলায় না; পরিষ্কার শুধু সেই ফাইল মোছে যা কোনো পোস্ট ব্যবহার করছে না এবং ৬ ঘণ্টার বেশি পুরনো।
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => scan(true)}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 border border-ink/25 bg-paper px-3 py-1.5 font-mono-x text-[10.5px] tracking-[0.14em] text-ink uppercase disabled:opacity-50"
        >
          {busy === "scan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
          স্ক্যান (কিছু বদলাবে না)
        </button>
        <button
          type="button"
          onClick={() => scan(false)}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 border border-alizarin bg-paper px-3 py-1.5 font-mono-x text-[10.5px] tracking-[0.14em] text-alizarin uppercase disabled:opacity-50"
        >
          {busy === "clean" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          অব্যহৃত মিডিয়া পরিষ্কার
        </button>
      </div>

      {error ? <p className="mt-3 text-[12px] text-alizarin">{error}</p> : null}

      {report ? (
        <div className="mt-4 border-t border-ink/15 pt-3">
          <p className="font-mono-x text-[10.5px] tracking-[0.14em] text-ink-soft uppercase">
            {report.scannedLocalFiles} ফাইল স্ক্যান · {report.referencedPaths} রেফারেন্স ·{" "}
            {report.remoteRows} রিমোট রেকর্ড · {total} সমস্যা
          </p>
          {report.deletedLocal.length > 0 || report.deletedRemoteRows > 0 ? (
            <p className="mt-1 text-[12px] font-bold text-ink">
              মোছা হয়েছে: {report.deletedLocal.length} লোকাল ফাইল, {report.deletedRemoteRows} রিমোট
              রেকর্ড।
            </p>
          ) : null}
          {total === 0 ? (
            <p className="mt-1.5 text-[12.5px] text-ink-soft">
              সব মিলে গেছে — কোনো অব্যহৃত ফাইল বা রেকর্ড নেই।
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {report.items.slice(0, 40).map((item, i) => (
                <li key={`${item.kind}-${i}`} className="border border-ink/15 bg-paper px-2.5 py-1.5">
                  <p className="font-mono-x text-[10px] tracking-[0.1em] text-alizarin uppercase">
                    {CLASS_LABEL[item.kind] ?? item.kind}
                  </p>
                  <p className="truncate font-mono-x text-[11px] text-ink">{item.rel}</p>
                  <p className="text-[11.5px] leading-relaxed text-ink-soft">{item.detail}</p>
                </li>
              ))}
              {report.items.length > 40 ? (
                <li className="text-[11.5px] text-ink-soft">
                  …আরও {report.items.length - 40}টি (প্রথম ৪০টি দেখানো হচ্ছে)
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

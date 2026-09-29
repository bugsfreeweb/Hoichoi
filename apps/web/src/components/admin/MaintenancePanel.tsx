"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "quarantine-unusable" | "trim-history";

/**
 * Operator maintenance panel for archive and log hygiene.
 *
 * Both operations are destructive, so each runs a dry-run first and shows the
 * exact count before offering the real run. That removes the need to trust a
 * blind confirm() dialog, which is how the earlier purge flow made operators
 * nervous enough to avoid it entirely.
 */
export function MaintenancePanel({ unusableCount }: { unusableCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [result, setResult] = useState<{ action: Action; msg: string; ok: boolean } | null>(
    null,
  );

  const call = async (action: Action, dryRun: boolean) => {
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          dryRun,
          ...(action === "trim-history" ? { olderThanDays: 90 } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        found?: number;
        quarantined?: number;
        runs?: number;
        actions?: number;
        error?: string;
      };
      if (!res.ok) {
        setResult({ action, ok: false, msg: data.error ?? "কাজটি ব্যর্থ হয়েছে।" });
        return;
      }
      const msg = dryRun
        ? (data.message ?? `${data.found ?? 0}টি পাওয়া গেছে।`)
        : action === "quarantine-unusable"
          ? `✓ ${data.quarantined ?? 0}টি পোস্ট rejected করা হয়েছে।`
          : `✓ ${data.runs ?? 0}টি রান ও ${data.actions ?? 0}টি অ্যাকশন লগ মোখা হয়েছে।`;
      setResult({ action, ok: true, msg });
      if (!dryRun) router.refresh();
    } catch {
      setResult({ action, ok: false, msg: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 border border-ink/20 bg-paper-deep p-5">
      <h3 className="font-sans-bn text-[15px] font-bold text-ink">রক্ষণাবেক্ষণ</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
        প্রতিটি কাজ আগে &ldquo;পরীক্ষা&rdquo; করে দেখায় কতগুলো প্রভাবিত হবে, তারপর আপনি
        নিশ্চিত করলে আসল কাজটি হয়।
      </p>

      <div className="mt-4 space-y-4">
        <Row
          title="অব্যবহারযোগ্য পোস্ট সরিয়ে দিন"
          desc={`শিরোনাম &ldquo;শিরোনাম ছাড়া&rdquo; বা ফাঁকা, অথবা দেহ খালি — এমন ${unusableCount}টি পোস্ট rejected হবে। মোছা হবে না, শুধু প্রকাশিত হবে না।`}
          busy={busy === "quarantine-unusable"}
          onDryRun={() => void call("quarantine-unusable", true)}
          onRun={() => void call("quarantine-unusable", false)}
          runLabel="সরিয়ে দিন"
          disabled={unusableCount === 0}
        />

        <Row
          title="পুরোনো লগ সাফ করুন"
          desc="৯০ দিনের বেশি পুরনো পাইপলাইন রান ও অ্যাডমিন অ্যাকশন লগ মুছে যাবে (চলমান রান বাদে)।"
          busy={busy === "trim-history"}
          onDryRun={() => void call("trim-history", true)}
          onRun={() => void call("trim-history", false)}
          runLabel="সাফ করুন"
        />
      </div>

      {result && (
        <p
          className={`mt-4 border-l-2 pl-3 text-[12.5px] leading-relaxed ${
            result.ok ? "border-lime text-ink" : "border-alizarin text-alizarin"
          }`}
        >
          {result.msg}
        </p>
      )}
    </div>
  );
}

function Row({
  title,
  desc,
  busy,
  onDryRun,
  onRun,
  runLabel,
  disabled,
}: {
  title: string;
  desc: string;
  busy: boolean;
  onDryRun: () => void;
  onRun: () => void;
  runLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-ink/10 pt-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{desc}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onDryRun}
          disabled={busy || disabled}
          className="border border-ink/30 px-3 py-1.5 text-[11.5px] font-bold text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
        >
          পরীক্ষা করুন
        </button>
        <button
          onClick={onRun}
          disabled={busy || disabled}
          className="bg-alizarin px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-alizarin/80 disabled:opacity-40"
        >
          {busy ? "চলছে…" : runLabel}
        </button>
      </div>
    </div>
  );
}

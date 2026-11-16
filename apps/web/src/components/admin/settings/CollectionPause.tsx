"use client";

import { useState } from "react";
import { useAdminAction } from "@/lib/admin-api";

/**
 * Collection stop switch.
 *
 * When something is wrong at the source — a false story spreading, a legal
 * complaint, a broken adapter filling the queue with junk — the operator needs
 * one control that stops the pipeline now, with a reason recorded, and one that
 * starts it again. Disabling sources one by one is not an emergency stop.
 *
 * The pipeline itself refuses to run while this is on (see runPipeline), so the
 * switch holds even for the scheduled GitHub Action.
 */
export function CollectionPause({
  paused,
  reason,
}: {
  paused: boolean;
  reason: string | null;
}) {
  const [on, setOn] = useState(paused);
  const [why, setWhy] = useState(reason ?? "");
  const [busy, setBusy] = useState(false);
  const action = useAdminAction();

  async function apply(next: boolean): Promise<void> {
    setBusy(true);
    try {
      const res = await action<{ ok?: boolean }>({
        path: "/api/settings",
        busy: next ? "সংগ্রহ থামানো হচ্ছে…" : "সংগ্রহ চালু করা হচ্ছে…",
        init: {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            collection_paused: next,
            collection_paused_reason: next ? why.trim() || null : null,
          }),
        },
        success: next ? "সংগ্রহ বন্ধ হয়েছে" : "সংগ্রহ আবার চালু হয়েছে",
        detail: next ? "পরের রান থেকে নতুন কিছু সংগ্রহ হবে না।" : "পরের নির্ধারিত রান থেকেই কাজ শুরু হবে।",
      });
      if (res) setOn(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`border p-4 ${on ? "border-alizarin bg-alizarin/5" : "border-ink/20 bg-paper"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">Collection switch</p>
          <p className="mt-1 font-sans-bn text-[15px] font-bold text-ink">
            {on ? "সংগ্রহ বন্ধ আছে" : "সংগ্রহ চালু আছে"}
          </p>
          {on && reason && <p className="mt-0.5 text-[12px] text-ink-soft">কারণ: {reason}</p>}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply(!on)}
          className={`border px-4 py-2 text-[12.5px] font-bold transition disabled:opacity-40 ${
            on ? "border-ink/40 text-ink hover:bg-lime" : "border-alizarin text-alizarin hover:bg-alizarin hover:text-on-accent"
          }`}
        >
          {busy ? "…" : on ? "আবার চালু করুন" : "সব সংগ্রহ থামান"}
        </button>
      </div>

      {!on && (
        <label className="mt-3 block">
          <span className="font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">থামানোর কারণ</span>
          <input
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            maxLength={300}
            placeholder="যেমন: একটি ভুল খবর ছড়াচ্ছে — ফ্যাক্টচেকের জন্য বিরতি"
            className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 text-[12.5px] text-ink"
          />
        </label>
      )}

      <p className="mt-3 border-t border-ink/15 pt-3 text-[11.5px] text-ink-soft">
        বন্ধ থাকলে পাইপলাইন শুরুই হবে না — রানটি ব্যর্থ হিসেবে লগ হবে, কারণসহ। ইতিমধ্যে প্রকাশিত পোস্ট অপরিবর্তিত থাকবে।
      </p>
    </div>
  );
}
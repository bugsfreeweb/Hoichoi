"use client";

import { useState } from "react";

export function RunPipelineButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<null | "ok" | "err" | "local" | "denied">(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/run-pipeline", { method: "POST" });
      const data = (await res.json()) as { error?: string; local?: boolean };
      if (res.status === 401 || res.status === 403) return setMsg("denied");
      if (!res.ok) {
        setMsg(data.local ? "local" : "err");
        return;
      }
      setMsg("ok");
    } catch {
      setMsg("err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="w-fit border-2 border-ink bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50"
      >
        {busy ? "ট্রিগার হচ্ছে…" : "⚡ এখনই পাইপলাইন চালান"}
      </button>
      {msg === "ok" && <span className="text-[12px] font-bold text-cat-teal">✓ রান ট্রিগার হয়েছে।</span>}
      {msg === "local" && (
        <span className="text-[12px] text-ink-soft">
          serverless রানার কনফিগার করা নেই — লোকালি চালান: <code className="bg-paper-deep px-1">pnpm --filter scraper scrape</code>
        </span>
      )}
      {msg === "err" && <span className="text-[12px] font-bold text-alizarin">✗ ট্রিগার ব্যর্থ।</span>}
      {msg === "denied" && <span className="text-[12px] font-bold text-alizarin">অনুমতি নেই — admin/editor প্রয়োজন।</span>}
    </div>
  );
}
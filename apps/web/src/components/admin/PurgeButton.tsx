"use client";

import { useState } from "react";

export function PurgeButton({ retentionDays }: { retentionDays: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<null | "ok" | "err">(null);

  async function run() {
    if (!confirm(`নিশ্চিত? ${retentionDays} দিনের বেশি পুরনো আর্কাইভ স্থায়ীভাবে মুছে যাবে।`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/purge", { method: "POST" });
      if (!res.ok) throw new Error();
      setMsg("ok");
    } catch {
      setMsg("err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={busy}
        className="border-2 border-alizarin bg-alizarin/10 px-4 py-2 text-[12.5px] font-bold text-alizarin transition hover:bg-alizarin hover:text-paper disabled:opacity-50"
      >
        {busy ? "মোছা হচ্ছে…" : "মেয়াদোত্তীর্ণ আর্কাইভ পুর্জ করুন"}
      </button>
      {msg === "ok" && <span className="text-[12px] font-bold text-cat-teal">✓ সম্পন্ন</span>}
      {msg === "err" && <span className="text-[12px] font-bold text-alizarin">✗ ব্যর্থ</span>}
    </div>
  );
}
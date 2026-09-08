"use client";

import { useState } from "react";

export function ReportSlugForm() {
  const [slug, setSlug] = useState("");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | "ok" | "err" | "sending">(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/report-content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, reason, email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "report failed");
      setStatus("ok");
    } catch (err) {
      setStatus("err");
    }
  }

  const field = "border border-ink/30 bg-paper px-3 py-2 text-[13.5px] font-medium focus:border-ink focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input required placeholder="পোস্ট slug (যেমন: joruri-nikhongjho-abc123)" className={`${field} w-full`} value={slug} onChange={(e) => setSlug(e.target.value)} />
      <textarea rows={3} placeholder="কারণ / বিবরণ" className={`${field} w-full`} value={reason} onChange={(e) => setReason(e.target.value)} />
      <input type="email" placeholder="আপনার ইমেইল (ঐচ্ছিক)" className={`${field} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} />
      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-4 py-3 text-[13px] font-bold text-ink">ধন্যবাদ! রিপোর্টটি রিসিভ হয়েছে।</p>}
      {status === "err" && <p className="border border-alizarin bg-alizarin/10 px-4 py-3 text-[13px] font-bold text-ink">পাঠানো যায়নি — slug পড়ুন: /post/slug ফরম্যাট চেক করুন।</p>}
      <button disabled={status === "sending"} className="w-fit border-2 border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50">
        {status === "sending" ? "পাঠানো হচ্ছে…" : "রিপোর্ট জমা দিন →"}
      </button>
    </form>
  );
}
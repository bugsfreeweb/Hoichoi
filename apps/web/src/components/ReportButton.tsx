"use client";

import { useState } from "react";

/** সমস্যা রিপোর্ট — আইনগত/সম্পাদকীয় ফিডব্যাক ডেলিভারি। */
export function ReportButton({ slug }: { slug: string }) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | "ok" | "err">(null);

  async function submit() {
    setSending(true);
    try {
      const res = await fetch("/api/report-content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      setDone(res.ok ? "ok" : "err");
    } catch {
      setDone("err");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-8 rounded-md border-2 border-ink p-5">
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">⚠️ সমস্যা রিপোর্ট করুন</p>
      <p className="mt-2 text-[14px] text-ink">
        এই প্রবন্ধে কোনো ভুল তথ্য, অসম্পূর্ণ তথ্য বা অনুপযুক্ত বিষয়বস্তু আছে বলে মনে করলে আমাদের জানান। আপনার রিপোর্ট সরাসরি মডারেশন কিউতে যায়।
      </p>
      {done === "ok" ? (
        <p className="mt-3 text-[13px] font-bold text-cat-teal">ধন্যবাদ! রিপোর্টটি রিসিভ করা হয়েছে।</p>
      ) : done === "err" ? (
        <p className="mt-3 text-[13px] font-bold text-alizarin">সমস্যা: রিপোর্ট পাঠানো যায়নি। আবার চেষ্টা করুন।</p>
      ) : (
        <button
          onClick={submit}
          disabled={sending}
          className="mt-3 border-2 border-ink bg-paper px-5 py-2 text-[13px] font-bold transition hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          {sending ? "পাঠানো হচ্ছে…" : "⚠️ রিপোর্ট করুন / Report this content →"}
        </button>
      )}
    </div>
  );
}
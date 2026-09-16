"use client";

import { useState, type FormEvent } from "react";
import { REPORT_REASONS, REPORT_REASON_LABELS } from "@/lib/report-reasons";

const Icons = {
  Flag: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
  ),
  Check: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  Loader: (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  ),
  X: (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  ),
};

/**
 * Public "রিপোর্ট করুন" control for a single reader post.
 * Collapsed by default; posts to /api/reports which validates the same
 * REPORT_REASONS list server-side. Editors review it in /admin/reports — the
 * report itself is never shown publicly.
 */
export function ReportForm({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          reporterName: name.trim(),
          reporterEmail: email.trim(),
          reason,
          details: details.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "রিপোর্ট পাঠানো যায়নি।");
      setMessage(data.message ?? "রিপোর্ট জমা হয়েছে।");
      setName("");
      setEmail("");
      setDetails("");
      setReason(REPORT_REASONS[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  if (message) {
    return (
      <div className="flex items-start gap-3 border border-ink/25 bg-paper-deep/60 px-4 py-3">
        <span className="mt-0.5 shrink-0 text-alizarin">{Icons.Check}</span>
        <div>
          <p className="text-[12.5px] font-semibold text-ink">{message}</p>
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setOpen(false);
            }}
            className="mt-1 text-[11.5px] font-bold text-alizarin underline"
          >
            আরেকটি রিপোর্ট পাঠান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-ink/25 bg-paper-deep/40">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="shrink-0 text-alizarin">{Icons.Flag}</span>
        <p className="text-[12.5px] text-ink-soft">
          এখানে ভুল তথ্য, কপিরাইট লঙ্ঘন বা আপত্তিকর কিছু পেয়েছেন?
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto flex items-center gap-2 border border-ink px-3.5 py-2 text-[11.5px] font-bold transition-colors hover:bg-ink hover:text-paper"
        >
          {open ? Icons.X : Icons.Flag}
          {open ? "বাতিল করুন" : "রিপোর্ট করুন"}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="grid gap-4 border-t border-ink/15 px-4 py-5 sm:grid-cols-2">
          <label className="text-[13px] font-semibold">
            আপনার নাম
            <input
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="নাম লিখুন"
              className="mt-2 w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-alizarin"
            />
          </label>
          <label className="text-[13px] font-semibold">
            ইমেইল <span className="font-normal text-ink-soft">(সম্পাদক দেখবেন)</span>
            <input
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-alizarin"
            />
          </label>
          <label className="text-[13px] font-semibold sm:col-span-2">
            কারণ
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-alizarin"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REPORT_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-semibold sm:col-span-2">
            বিস্তারিত <span className="font-normal text-ink-soft">(ঐচ্ছিক · সর্বোচ্চ ৫০০ অক্ষর)</span>
            <textarea
              rows={3}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="কী সমস্যা মনে হচ্ছে সংক্ষেপে লিখুন"
              className="mt-2 w-full resize-y border border-ink/20 bg-paper px-3 py-2.5 text-sm outline-none focus:border-alizarin"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-paper transition-colors hover:bg-alizarin disabled:opacity-50"
            >
              {busy ? Icons.Loader : Icons.Flag}
              রিপোর্ট জমা দিন
            </button>
            <span className="text-[11.5px] text-ink-soft">
              রিপোর্ট শুধু সম্পাদকীয় দল দেখে — মন্তব্যে প্রকাশিত হয় না।
            </span>
          </div>
          {error && (
            <p role="alert" className="text-[12.5px] text-alizarin sm:col-span-2">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import type { CategorySlug } from "@hoichoi/shared-types";

const CATEGORIES: Array<{ slug: CategorySlug | ""; label: string }> = [
  { slug: "", label: "বাছাই করুন…" },
  { slug: "child-sexual-abuse", label: "শিশু যৌন নির্যাতন" },
  { slug: "extramarital-crime", label: "পরকীয়া অপরাধ" },
  { slug: "missing-children", label: "নিখোঁজ শিশু ও ছেলে ধরা" },
];

export function SubmitSourceForm() {
  const [form, setForm] = useState({
    pageUrl: "",
    pageName: "",
    category: "" as CategorySlug | "",
    submitterEmail: "",
    submitterName: "",
    notes: "",
  });
  const [status, setStatus] = useState<null | "ok" | "err" | "sending">(null);
  const [errorMsg, setErrorMsg] = useState("");

  // পাবলিক ফর্মে রেট লিমিট — প্রতি সাবমিশনে localStorage গার্ড।
  function recentSubmissionAllowed(): boolean {
    const last = Number(localStorage.getItem("hoichoi_submit_ts") ?? 0);
    const ok = Date.now() - last > 60_000;
    if (ok) localStorage.setItem("hoichoi_submit_ts", String(Date.now()));
    return ok;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (typeof window !== "undefined" && !recentSubmissionAllowed()) {
      setErrorMsg("এক মিনিটে একবারের বেশি প্রস্তাব গ্রহণ করা হয় না।");
      setStatus("err");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/submit-page", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "submission failed");
      setStatus("ok");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus("err");
    }
  }

  const field =
    "border border-ink/30 bg-paper px-3 py-2 text-[13.5px] font-medium focus:border-ink focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="block text-[11px] font-bold text-ink-soft">ফেসবুক পেজ/গ্রুপ URL *</span>
        <input
          required
          type="url"
          placeholder="https://www.facebook.com/pagename"
          className={`${field} mt-1 w-full`}
          value={form.pageUrl}
          onChange={(e) => setForm({ ...form, pageUrl: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="block text-[11px] font-bold text-ink-soft">পেজের নাম</span>
        <input
          className={`${field} mt-1 w-full`}
          value={form.pageName}
          onChange={(e) => setForm({ ...form, pageName: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="block text-[11px] font-bold text-ink-soft">ক্যাটাগরি</span>
        <select
          className={`${field} mt-1 w-full`}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as CategorySlug | "" })}
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-[11px] font-bold text-ink-soft">আপনার ইমেইল</span>
        <input
          type="email"
          className={`${field} mt-1 w-full`}
          value={form.submitterEmail}
          onChange={(e) => setForm({ ...form, submitterEmail: e.target.value })}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-[11px] font-bold text-ink-soft">নোট / কেন এই পেজ?</span>
        <textarea
          rows={4}
          className={`${field} mt-1 w-full`}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>

      {status === "ok" && (
        <p className="sm:col-span-2 border border-cat-teal bg-cat-teal/10 px-4 py-3 text-[13px] font-bold text-ink">
          ধন্যবাদ! আপনার প্রস্তাবটি সাবমিশন কিউতে যোগ হয়েছে — মডারেটর রিভিউ করবেন।
        </p>
      )}
      {status === "err" && (
        <p className="sm:col-span-2 border border-alizarin bg-alizarin/10 px-4 py-3 text-[13px] font-bold text-ink">
          পাঠানো যায়নি: {errorMsg || "আবার চেষ্টা করুন"}
        </p>
      )}

      <button
        disabled={status === "sending"}
        className="sm:col-span-2 border-2 border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50"
      >
        {status === "sending" ? "পাঠানো হচ্ছে…" : "প্রস্তাব জমা দিন →"}
      </button>
      <p className="sm:col-span-2 text-[11px] text-ink-soft/80">
        ব্যক্তিগত প্রোফাইল নয় — কেবল পেজ ও গ্রুপ গ্রহণ করা হয়। প্রতিটি প্রস্তাব ম্যানুয়াল যাচাইয়ের পর অনুমোদিত হয়।
      </p>
    </form>
  );
}
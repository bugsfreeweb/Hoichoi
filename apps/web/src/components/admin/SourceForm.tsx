"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "child-sexual-abuse", label: "শিশু যৌন নির্যাতন" },
  { value: "extramarital-crime", label: "বৈবাহিক অপরাধ" },
  { value: "missing-children", label: "নিখোঁজ শিশু" },
];

export function SourceForm() {
  const [form, setForm] = useState({ pageUrl: "", pageName: "", category: "missing-children" as string });
  const [status, setStatus] = useState<null | "ok" | "err" | "busy" | "denied">(null);

  const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none focus:border-ink";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (res.status === 401 || res.status === 403) {
        setStatus("denied");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "failed");
      setStatus("ok");
      setForm({ pageUrl: "", pageName: "", category: "missing-children" });
    } catch {
      setStatus("err");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">পেজ URL</span>
        <input
          required
          className={field}
          placeholder="https://www.facebook.com/pagename"
          value={form.pageUrl}
          onChange={(e) => setForm({ ...form, pageUrl: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">পেজ নাম</span>
        <input
          className={field}
          placeholder="ঐচ্ছিক"
          value={form.pageName}
          onChange={(e) => setForm({ ...form, pageName: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">ক্যাটাগরি</span>
        <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12.5px] font-bold text-ink">✓ যোগ হয়েছে।</p>}
      {status === "err" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">✗ যোগ করা যায়নি।</p>}
      {status === "denied" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">অনুমতি নেই — admin/editor প্রয়োজন।</p>}
      <button className="w-fit border-2 border-ink bg-ink px-5 py-2 text-[12.5px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50" disabled={status === "busy"}>
        সোর্স যোগ করুন →
      </button>
    </form>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CategoryForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: "",
    displayNameBn: "",
    displayNameEn: "",
    descriptionBn: "",
    descriptionEn: "",
    dot: "",
    sortOrder: 99,
    showInFooter: true,
  });
  const [status, setStatus] = useState<null | "ok" | "err" | "busy" | "denied">(null);
  const [err, setErr] = useState<string | null>(null);

  const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none focus:border-ink";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setErr(null);
    try {
      const res = await fetch("/api/categories", {
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
      setForm({ slug: "", displayNameBn: "", displayNameEn: "", descriptionBn: "", descriptionEn: "", dot: "", sortOrder: 99, showInFooter: true });
      router.refresh();
    } catch (e) {
      setStatus("err");
      setErr(e instanceof Error ? e.message : "ব্যর্থ।");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Slug *</span>
        <input
          required
          pattern="[a-z0-9-]+"
          title="শুধু লোয়ার-কেস অক্ষর, সংখ্যা ও ড্যাশ"
          className={field}
          placeholder="politics"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">নাম (বাংলা) *</span>
        <input
          required
          className={field}
          placeholder="রাজনীতি"
          value={form.displayNameBn}
          onChange={(e) => setForm({ ...form, displayNameBn: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">নাম (ইংরেজি) *</span>
        <input
          required
          className={field}
          placeholder="Politics"
          value={form.displayNameEn}
          onChange={(e) => setForm({ ...form, displayNameEn: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">বিবরণ (বাংলা)</span>
        <textarea
          rows={2}
          className={field}
          value={form.descriptionBn}
          onChange={(e) => setForm({ ...form, descriptionBn: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">বিবরণ (ইংরেজি)</span>
        <textarea
          rows={2}
          className={field}
          value={form.descriptionEn}
          onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">ডট রং</span>
          <input
            type="color"
            className="h-[38px] w-full cursor-pointer border border-ink/30 bg-paper p-1"
            value={form.dot || "#0a0c10"}
            onChange={(e) => setForm({ ...form, dot: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">সাজানো (sort)</span>
          <input
            type="number"
            className={field}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="flex cursor-pointer items-center gap-2 border border-ink/20 bg-paper px-3 py-2 text-[12.5px]">
        <input
          type="checkbox"
          checked={form.showInFooter}
          onChange={(e) => setForm({ ...form, showInFooter: e.target.checked })}
          className="accent-ink"
        />
        ফুটারে দেখাবে
      </label>
      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12.5px] font-bold text-ink">✓ যোগ হয়েছে।</p>}
      {status === "err" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">{err ?? "✗ যোগ করা যায়নি।"}</p>}
      {status === "denied" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">অনুমতি নেই — admin/editor প্রয়োজন।</p>}
      <button className="w-fit border-2 border-ink bg-ink px-5 py-2 text-[12.5px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50" disabled={status === "busy"}>
        বিভাগ যোগ করুন →
      </button>
    </form>
  );
}
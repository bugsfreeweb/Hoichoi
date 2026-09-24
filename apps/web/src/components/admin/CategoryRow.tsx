"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryMeta } from "@hoichoi/shared-types";

export function CategoryRow({ category }: { category: CategoryMeta }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayNameBn: category.displayNameBn,
    displayNameEn: category.displayNameEn,
    descriptionBn: category.descriptionBn,
    descriptionEn: category.descriptionEn,
    dot: category.dot,
    sortOrder: category.sortOrder,
    showInFooter: category.showInFooter,
    isActive: category.isActive,
  });

  const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none focus:border-ink";

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: category.slug, fields: form }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.status === 401 || res.status === 403) {
        setErr("অনুমতি নেই — admin/editor প্রয়োজন।");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "failed");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ।");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`"${category.displayNameBn}" বিভাগটি মুছে ফেলবেন?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/categories?slug=${encodeURIComponent(category.slug)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.status === 401 || res.status === 403) {
        setErr("অনুমতি নেই — কেবল admin ডিলিট করতে পারবে।");
        return;
      }
      if (!res.ok) throw new Error(data?.error ?? "delete failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "মোছা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="grid gap-3 border border-ink/30 bg-paper-deep px-4 py-3">
        <p className="font-mono-x text-[10.5px] uppercase tracking-[0.2em] text-ink-soft">slug: {category.slug}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">নাম (বাংলা)</span>
            <input className={field} value={form.displayNameBn} onChange={(e) => setForm({ ...form, displayNameBn: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">নাম (ইংরেজি)</span>
            <input className={field} value={form.displayNameEn} onChange={(e) => setForm({ ...form, displayNameEn: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">বিবরণ (বাংলা)</span>
          <textarea rows={2} className={field} value={form.descriptionBn} onChange={(e) => setForm({ ...form, descriptionBn: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">বিবরণ (ইংরেজি)</span>
          <textarea rows={2} className={field} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
        </label>
        <div className="grid grid-cols-3 gap-3">
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
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">সাজানো</span>
            <input type="number" className={field} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </label>
          <div className="flex items-end gap-2 pb-0.5">
            <label className="flex cursor-pointer items-center gap-1.5 border border-ink/20 bg-paper px-2.5 py-2 text-[11px]">
              <input type="checkbox" checked={form.showInFooter} onChange={(e) => setForm({ ...form, showInFooter: e.target.checked })} className="accent-ink" />
              ফুটার
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 border border-ink/20 bg-paper px-2.5 py-2 text-[11px]">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-ink" />
              সক্রিয়
            </label>
          </div>
        </div>
        {err && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">{err}</p>}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-[12.5px] font-bold text-paper transition disabled:opacity-50 bg-ink hover:bg-alizarin" disabled={busy}>
            ✓ সংরক্ষণ
          </button>
          <button type="button" className="px-4 py-2 text-[12.5px] font-bold text-ink border border-ink/30 hover:border-ink" onClick={() => setEditing(false)}>
            বাতিল
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: category.dot || "#0a0c10" }} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-ink">
            {category.displayNameBn}
            <span className="ml-2 font-mono-x text-[10.5px] font-normal text-ink-soft">{category.slug}</span>
          </p>
          <p className="truncate font-mono-x text-[11px] text-ink-soft">
            {category.displayNameEn} · sort {category.sortOrder}
          </p>
          {(category.descriptionBn || category.descriptionEn) && (
            <p className="mt-0.5 truncate text-[11.5px] text-ink-soft">
              {category.descriptionBn || category.descriptionEn}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!category.isActive && (
          <span className="rounded-full bg-alizarin px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-paper">নিষ্ক্রিয়</span>
        )}
        {category.showInFooter && (
          <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Footer</span>
        )}
        <button onClick={() => setEditing(true)} disabled={busy} title="সম্পাদনা" className="flex h-7 w-7 items-center justify-center border border-ink/25 text-ink transition hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button onClick={remove} disabled={busy} title="মুছুন" className="flex h-7 w-7 items-center justify-center border border-alizarin/40 text-alizarin transition hover:bg-alizarin hover:text-white disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </div>
  );
}
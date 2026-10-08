"use client";

import { useState } from "react";
import { normalizePlatform, type SourcePlatform } from "@hoichoi/shared-types";

type CategoryOption = { slug: string; label: string };

const PLATFORMS: { value: SourcePlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X / Twitter" },
  { value: "news", label: "নিউজ ওয়েবসাইট" },
  { value: "magazine", label: "ম্যাগাজিন" },
  { value: "social", label: "অন্যান্য সোশ্যাল" },
  { value: "other", label: "অন্যান্য" },
];

export function SourceForm({ categories }: { categories: CategoryOption[] }) {
  const [form, setForm] = useState({
    pageUrl: "",
    pageName: "",
    platform: "facebook" as SourcePlatform,
    kind: "page" as "page" | "group",
    categories: [] as string[],
    allCategories: false,
  });
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
      setForm({ pageUrl: "", pageName: "", platform: "facebook", kind: "page", categories: [], allCategories: false });
    } catch {
      setStatus("err");
    }
  }

  function toggleCategory(slug: string) {
    setForm((f) => ({
      ...f,
      allCategories: false,
      categories: f.categories.includes(slug)
        ? f.categories.filter((c) => c !== slug)
        : [...f.categories, slug],
    }));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">প্ল্যাটফর্ম</span>
        <select
          className={field}
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: normalizePlatform(e.target.value) })}
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </label>
      {form.platform === "facebook" && (
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">ধরন</span>
          <select
            className={field}
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value === "group" ? "group" : "page" })}
          >
            <option value="page">পেজ</option>
            <option value="group">গ্রুপ</option>
          </select>
        </label>
      )}
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
          {form.platform === "facebook" ? "পেজ URL" : "সোর্স URL / ফিড"}
        </span>
        <input
          required
          className={field}
          placeholder={form.platform === "facebook" ? "https://www.facebook.com/pagename" : "https://example.com/feed"}
          value={form.pageUrl}
          onChange={(e) => setForm({ ...form, pageUrl: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">নাম</span>
        <input
          className={field}
          placeholder="ঐচ্ছিক"
          value={form.pageName}
          onChange={(e) => setForm({ ...form, pageName: e.target.value })}
        />
      </label>
      <fieldset className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">ক্যাটাগরি</span>
        <div className="mt-1 grid gap-1.5">
          {categories.map((c) => (
            <label key={c.slug} className="flex cursor-pointer items-center gap-2 border border-ink/20 bg-paper px-3 py-2 text-[12.5px] hover:border-ink/50">
              <input
                type="checkbox"
                checked={form.categories.includes(c.slug)}
                onChange={() => toggleCategory(c.slug)}
                className="accent-ink"
              />
              {c.label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2 border border-ink/20 bg-paper-deep px-3 py-2 text-[12.5px] font-bold hover:border-ink/50">
            <input
              type="checkbox"
              checked={form.allCategories}
              onChange={(e) =>
                setForm((f) => ({ ...f, allCategories: e.target.checked, categories: [] }))
              }
              className="accent-ink"
            />
            সব বিভাগ
          </label>
        </div>
      </fieldset>
      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12.5px] font-bold text-ink">✓ যোগ হয়েছে।</p>}
      {status === "err" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">✗ যোগ করা যায়নি।</p>}
      {status === "denied" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">অনুমতি নেই — admin/editor প্রয়োজন।</p>}
      <button className="w-fit border-2 border-ink bg-ink px-5 py-2 text-[12.5px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50" disabled={status === "busy"}>
        সোর্স যোগ করুন →
      </button>
    </form>
  );
}
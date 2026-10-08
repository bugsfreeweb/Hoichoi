"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Source, SourcePlatform } from "@hoichoi/shared-types";
import { normalizePlatform } from "@hoichoi/shared-types";
import { ExternalLink } from "./ExternalLink";

type CategoryOption = { slug: string; label: string };

const PLATFORMS: { value: SourcePlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X / Twitter" },
  { value: "news", label: "নিউজ ওয়েবসাইট" },
  { value: "magazine", label: "ম্যাগাজিন" },
  { value: "social", label: "অন্যান্য সোশ্যাল" },
  { value: "other", label: "অন্যান্য" },
];

const PLATFORM_LABEL: Record<SourcePlatform, string> = {
  facebook: "Facebook",
  x: "X",
  news: "News",
  magazine: "Magazine",
  social: "Social",
  other: "Other",
};

export function SourceRow({
  source,
  categories,
}: {
  source: Source;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [active, setActive] = useState(source.is_active);
  const [verified, setVerified] = useState(source.is_verified);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    pageUrl: string;
    pageName: string;
    platform: SourcePlatform;
    kind: "page" | "group";
    categories: string[];
    allCategories: boolean;
  }>({
    pageUrl: source.page_url,
    pageName: source.page_name,
    platform: source.platform ?? "facebook",
    kind: source.kind ?? "page",
    categories: source.categories.length ? source.categories : [source.category],
    allCategories: false,
  });

  async function patch(next: { is_active?: boolean; is_verified?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        if (typeof next.is_active === "boolean") setActive(next.is_active);
        if (typeof next.is_verified === "boolean") setVerified(next.is_verified);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const requested = editForm.allCategories
        ? categories.map((c) => c.slug)
        : editForm.categories;
      if (requested.length === 0) {
        setErr("অন্তত একটি বিভাগ নির্বাচন করুন — সোর্সের বিভাগ খালি রাখা যাবে না।");
        return;
      }
      const res = await fetch("/api/sources", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceId: source.id,
          pageUrl: editForm.pageUrl.trim(),
          pageName: editForm.pageName.trim(),
          platform: editForm.platform,
          kind: editForm.kind,
          categories: requested,
        }),
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
    if (!window.confirm(`"${source.page_name}" সোর্সটি মুছে ফেলবেন?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "DELETE",
      });
      if (res.status === 401 || res.status === 403) {
        setErr("অনুমতি নেই — কেবল admin ডিলিট করতে পারবে।");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "delete failed");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "মোছা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  function toggleCategory(slug: string) {
    setEditForm((f) => {
      // Ticking "সব বিভাগ" then unticking one box means "all except this" — seed
      // the full set first so the untick actually subtracts instead of leaving
      // an empty (and rejected) list.
      const base = f.allCategories ? categories.map((c) => c.slug) : f.categories;
      return {
        ...f,
        allCategories: false,
        categories: base.includes(slug) ? base.filter((c) => c !== slug) : [...base, slug],
      };
    });
  }

  const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none focus:border-ink";

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="grid gap-3 border border-ink/30 bg-paper-deep px-4 py-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">প্ল্যাটফর্ম</span>
            <select
              className={field}
              value={editForm.platform}
              onChange={(e) => setEditForm({ ...editForm, platform: normalizePlatform(e.target.value) })}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          {editForm.platform === "facebook" && (
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">ধরন</span>
              <select
                className={field}
                value={editForm.kind}
                onChange={(e) => setEditForm({ ...editForm, kind: e.target.value === "group" ? "group" : "page" })}
              >
                <option value="page">পেজ</option>
                <option value="group">গ্রুপ</option>
              </select>
            </label>
          )}
        </div>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">পেজ URL</span>
          <input
            required
            className={field}
            value={editForm.pageUrl}
            onChange={(e) => setEditForm({ ...editForm, pageUrl: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">পেজ নাম</span>
          <input
            className={field}
            value={editForm.pageName}
            onChange={(e) => setEditForm({ ...editForm, pageName: e.target.value })}
          />
        </label>
        <fieldset>
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">ক্যাটাগরি</span>
          <div className="mt-1 grid gap-1.5">
            {categories.map((c) => (
              <label key={c.slug} className="flex cursor-pointer items-center gap-2 border border-ink/20 bg-paper px-3 py-2 text-[12.5px] hover:border-ink/50">
                <input
                  type="checkbox"
                  checked={editForm.allCategories || editForm.categories.includes(c.slug)}
                  onChange={() => toggleCategory(c.slug)}
                  className="accent-ink"
                />
                {c.label}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-2 border border-ink/20 bg-paper-deep px-3 py-2 text-[12.5px] font-bold hover:border-ink/50">
              <input
                type="checkbox"
                checked={editForm.allCategories}
                onChange={(e) => {
                  const on = e.target.checked;
                  // Keep a concrete list so the boxes above stay truthful when
                  // "all" is switched back off.
                  const current = on
                    ? categories.map((c) => c.slug)
                    : editForm.categories.length
                      ? editForm.categories
                      : [source.category];
                  setEditForm((f) => ({ ...f, allCategories: on, categories: current }));
                }}
                className="accent-ink"
              />
              সব বিভাগ
            </label>
          </div>
          {editForm.allCategories && (
            <p className="mt-1.5 text-[11.5px] text-ink-soft">
              সব বিভাগ নির্বাচিত। কোনো একটি বাকি দিলে সেটি বাদ যাবে।
            </p>
          )}
        </fieldset>
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
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ExternalLink href={source.page_url} className="truncate text-[13.5px] font-bold text-ink hover:text-alizarin">
            {source.page_name}
          </ExternalLink>
          <span className="rounded-full border border-ink/30 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest text-ink-soft">
            {PLATFORM_LABEL[source.platform ?? "facebook"]}
            {source.kind === "group" ? " · গ্রুপ" : ""}
          </span>
        </div>
        <p className="truncate font-mono-x text-[11px] text-ink-soft">{source.page_url}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex max-w-[280px] flex-wrap items-center justify-end gap-1">
          {(source.categories.length ? source.categories : [source.category]).map((c) => (
            <span key={c} className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
              {c}
            </span>
          ))}
        </div>
        <Tag active={verified} onClick={() => patch({ is_verified: !verified })} busy={busy} label="Verified" />
        <Tag active={active} onClick={() => patch({ is_active: !active })} busy={busy} label={active ? "Active" : "Paused"} />
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

function Tag({ active, onClick, busy, label }: { active: boolean; onClick: () => void; busy: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-paper transition disabled:opacity-50 ${active ? "bg-cat-teal" : "bg-ink-soft"}`}
    >
      {label}
    </button>
  );
}
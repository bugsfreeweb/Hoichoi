"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { bnTime, toBn } from "@/lib/format";
import { categoryLabel, categoryTint } from "@/lib/category-style";
import type { CategoryMeta, Post, PostStatus } from "@hoichoi/shared-types";

type Tab = "all" | "published" | "pending";

const TAB_LABEL: Record<Tab, string> = {
  all: "সব",
  published: "প্রকাশিত",
  pending: "অপেক্ষমান",
};

const STATUS_STYLE: Record<string, { bg: string; tx: string; bn: string }> = {
  published: { bg: "bg-lime/15", tx: "text-lime", bn: "প্রকাশিত" },
  pending_review: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
  approved: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
  rejected: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
  removed: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
};

const STYLE_DEFAULT: { bg: string; tx: string; bn: string } = { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" };

function tabKey(status: PostStatus): Tab {
  if (status === "published") return "published";
  return "pending";
}

export default function ContentQueue({
  rows,
  cats,
}: {
  rows: Post[];
  cats?: Array<Pick<CategoryMeta, "slug" | "dot" | "displayNameBn" | "displayNameEn">>;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: rows.length, published: 0, pending: 0 };
    rows.forEach((r) => { c[tabKey(r.status)]++; });
    return c;
  }, [rows]);

  const shown = rows.filter(
    (r) =>
      (tab === "all" || tabKey(r.status) === tab) &&
      (q.trim() === "" ||
        r.title_bn.toLowerCase().includes(q.trim().toLowerCase()) ||
        r.source_name.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <p className="font-serif-bn text-[17px] font-bold text-white">কনটেন্ট সারি</p>
        <span className="font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
          CONTENT QUEUE · AUTO-FEED
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="শিরোনাম / সোর্স খুঁজুন…"
              className="w-44 bg-transparent text-[11.5px] text-white/85 outline-none placeholder:text-white/30"
            />
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-5 py-3">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 ${
              tab === t ? "bg-white text-night" : "text-white/50 hover:bg-white/8 hover:text-white"
            }`}
          >
            {TAB_LABEL[t]}{" "}
            <span className={`font-mono-x text-[9.5px] ${tab === t ? "text-night/60" : "text-white/35"}`}>
              {toBn(counts[t])}
            </span>
          </button>
        ))}
      </div>

      {/* table */}
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="px-5 py-3 font-medium"># আইটেম</th>
              <th className="px-3 py-3 font-medium">সোর্স</th>
              <th className="px-3 py-3 font-medium">সংগ্রহ</th>
              <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody key={`${tab}-${q}`} className="divide-y divide-white/6">
            {shown.map((r) => {
              const s = STATUS_STYLE[r.status] ?? STYLE_DEFAULT;
              return (
                <tr key={r.id} className="group transition-colors duration-200 hover:bg-white/[0.035]">
                  <td className="max-w-[340px] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono-x text-[10px] text-white/30">
                        {String(r.id).slice(0, 6)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-white/90">
                          {r.title_bn}
                        </p>
                        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] text-white/55">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: categoryTint(r.category, cats) }}
                          />
                          {categoryLabel(r.category, cats)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[11.5px] text-white/60">
                    {r.source_name}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[11px] text-white/60">
                    {bnTime(r.created_at)}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg} ${s.tx}`}>
                      {s.bn}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5 opacity-40 transition-opacity duration-200 group-hover:opacity-100">
                      {r.status === "published" && (
                        <Link
                          href={`/post/${r.slug}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-lime/60 hover:text-lime"
                          title="দেখুন"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-[12.5px] text-white/35">
                  কোনো আইটেম মিললো না — ফিল্টার বদলে দেখুন।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
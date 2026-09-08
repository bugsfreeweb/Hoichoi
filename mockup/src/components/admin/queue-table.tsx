"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  RefreshCw,
  ExternalLink,
  CircleCheck,
  Clock3,
  Ban,
} from "lucide-react";
import { CATEGORY_LABEL, bnTime, toBn } from "@/lib/format";
import type { ArticleLite } from "@/lib/data";

type Tab = "all" | "published" | "pending" | "duplicate";

const TAB_LABEL: Record<Tab, string> = {
  all: "সব",
  published: "প্রকাশিত",
  pending: "অপেক্ষমান",
  duplicate: "ডুপ্লিকেট",
};

const STATUS_STYLE: Record<string, { bg: string; tx: string; icon: typeof CircleCheck; bn: string }> = {
  published: { bg: "bg-lime/15", tx: "text-lime", icon: CircleCheck, bn: "প্রকাশিত" },
  pending: { bg: "bg-amberx/15", tx: "text-amberx", icon: Clock3, bn: "রিভিউ অপেক্ষায়" },
  duplicate: { bg: "bg-rose-500/12", tx: "text-rose-300", icon: Ban, bn: "ডুপ্লিকেট ব্লক" },
};

export default function QueueTable({ rows }: { rows: ArticleLite[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: rows.length,
      published: 0,
      pending: 0,
      duplicate: 0,
    };
    rows.forEach((r) => {
      if (r.status in c) c[r.status as Tab]++;
    });
    return c;
  }, [rows]);

  const shown = rows.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (q.trim() === "" ||
        r.title.toLowerCase().includes(q.trim().toLowerCase()) ||
        r.sourceName.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <div className="panel overflow-hidden rounded-2xl">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <p className="font-serif-bn text-[17px] font-bold text-white">
          কনটেন্ট সারি
        </p>
        <span className="font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
          CONTENT QUEUE · AUTO-FEED
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <Search size={12} className="text-white/40" />
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
              tab === t
                ? "bg-white text-night"
                : "text-white/50 hover:bg-white/8 hover:text-white"
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
              <th className="px-3 py-3 font-medium">হ্যাশ</th>
              <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody key={`${tab}-${q}`} className="grid-pop divide-y divide-white/6">
            {shown.map((r) => {
              const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
              const Icon = s.icon;
              return (
                <tr
                  key={r.id}
                  className="group transition-colors duration-200 hover:bg-white/[0.035]"
                >
                  <td className="max-w-[340px] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono-x text-[10px] text-white/30">
                        {String(r.id).padStart(3, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-white/90">
                          {r.title}
                        </p>
                        <span
                          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] text-white/55"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background:
                                r.category === "crime"
                                  ? "#d2202c"
                                  : r.category === "child"
                                    ? "#60a5fa"
                                    : r.category === "family"
                                      ? "#2dd4bf"
                                      : "#fbbf24",
                            }}
                          />
                          {CATEGORY_LABEL[r.category] ?? r.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[11.5px] text-white/60">
                    {r.sourceName}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[11px] text-white/60">
                    {bnTime(r.collectedAt)}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[10.5px] text-amberx/80">
                    {r.hash.slice(0, 8)}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg} ${s.tx}`}
                    >
                      <Icon size={10.5} />
                      {s.bn}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5 opacity-40 transition-opacity duration-200 group-hover:opacity-100">
                      {r.status === "published" && (
                        <Link
                          href={`/news/${r.id}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-lime/60 hover:text-lime"
                          title="দেখুন"
                        >
                          <Eye size={12} />
                        </Link>
                      )}
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-amberx/60 hover:text-amberx"
                        title="পুনঃপ্রক্রিয়া"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-white/40 hover:text-white"
                        title="মূল পোস্ট"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-[12.5px] text-white/35">
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

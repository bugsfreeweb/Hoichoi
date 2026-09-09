"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CommentWithPost } from "@hoichoi/shared-types";

type Tab = "all" | "pending" | "approved" | "blocked";

const TAB_BN: Record<Tab, string> = {
  all: "সব",
  pending: "অপেক্ষমান",
  approved: "অনুমোদিত",
  blocked: "ব্লকড",
};

const STATUS_CLS: Record<string, string> = {
  pending: "bg-amberx/15 text-amberx",
  approved: "bg-lime/15 text-lime",
  blocked: "bg-rose-500/15 text-rose-300",
};
const STATUS_BN: Record<string, string> = {
  pending: "অপেক্ষমান",
  approved: "অনুমোদিত",
  blocked: "ব্লকড",
};

function bn(n: number): string {
  return n.toLocaleString("bn-BD");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "এইমাত্র";
  if (mins < 60) return `${bn(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${bn(hours)} ঘণ্টা আগে`;
  return `${bn(Math.floor(hours / 24))} দিন আগে`;
}

export function ModerationTable({ rows }: { rows: CommentWithPost[] }) {
  const [list, setList] = useState(rows);
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setList(rows), [rows]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: list.length, pending: 0, approved: 0, blocked: 0 };
    list.forEach((r) => {
      if (r.status in c) c[r.status as Tab]++;
    });
    return c;
  }, [list]);

  const shown = list.filter((r) => tab === "all" || r.status === tab);

  const act = async (id: string, action: "approve" | "block" | "delete") => {
    setBusy(id);
    try {
      if (action === "delete") {
        await fetch("/api/comments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setList((ls) => ls.filter((r) => r.id !== id));
      } else {
        await fetch("/api/comments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        setList((ls) =>
          ls.map((r) =>
            r.id === id ? { ...r, status: action === "approve" ? "approved" : "blocked" } : r,
          ),
        );
      }
    } finally {
      setBusy(null);
    }
  };  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/15 text-[15px]">💬</span>
        <div>
          <p className="font-serif-bn text-[17px] font-bold text-white">মন্তব্য মডারেশন</p>
          <p className="font-mono-x text-[9px] tracking-[0.22em] text-white/35 uppercase">
            PUBLIC COMMENTS · QUEUE → LIVE
          </p>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-white/12 px-3 py-1 font-mono-x text-[9.5px] tracking-[0.14em] text-white/50 uppercase md:flex">
          🛡 অনুমোদন ছাড়া পাবলিকে না
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-5 py-3">
        {(Object.keys(TAB_BN) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 ${
              tab === t ? "bg-white text-night" : "text-white/50 hover:bg-white/8 hover:text-white"
            }`}
          >
            {TAB_BN[t]}{" "}
            <span className={`font-mono-x text-[9.5px] ${tab === t ? "text-night/60" : "text-white/35"}`}>
              {bn(counts[t])}
            </span>
          </button>
        ))}
      </div>

      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="px-5 py-3 font-medium">মন্তব্য</th>
              <th className="px-3 py-3 font-medium">প্রতিবেদন</th>
              <th className="px-3 py-3 font-medium">সময়</th>
              <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {shown.map((r) => (
              <tr key={r.id} className="transition-colors duration-200 hover:bg-white/[0.03]">
                <td className="max-w-[360px] px-5 py-3.5">
                  <p className="text-[12.5px] font-semibold text-white/90">{r.author}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-white/55">{r.body}</p>
                </td>
                <td className="max-w-[220px] px-3 py-3.5">
                  {r.postTitle ? (
                    <Link href={`/post/${r.post_id}`} className="line-clamp-2 text-[11.5px] leading-snug text-sky-300/90 hover:underline">
                      {r.postTitle}
                    </Link>
                  ) : (
                    <span className="text-[11.5px] text-white/35">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 font-mono-x text-[11px] text-white/50">
                  {timeAgo(r.created_at)}
                </td>
                <td className="px-3 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_CLS[r.status] ?? STATUS_CLS.pending}`}>
                    {STATUS_BN[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {busy === r.id ? (
                      <span className="text-[11px] text-white/40">· চলছে …</span>
                    ) : (
                      <>
                        {r.status !== "approved" && (
                          <button onClick={() => act(r.id, "approve")} title="অনুমোদন করুন"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-lime/60 hover:text-lime">✓</button>
                        )}
                        {r.status !== "blocked" && (
                          <button onClick={() => act(r.id, "block")} title="ব্লক করুন"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-amberx/60 hover:text-amberx">⊘</button>
                        )}
                        <button onClick={() => act(r.id, "delete")} title="মুছে ফেলুন"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-rose-400/60 hover:text-rose-300">🗑</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-[12.5px] text-white/35">এই সারিতে কোনো মন্তব্য নেই।</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/8 px-5 py-3 font-mono-x text-[9px] tracking-[0.18em] text-white/30 uppercase">
        অনুমোদিত মন্তব্যই শুধু পাবলিক প্রতিবেদনে দেখা যায় · pending → approved → live
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Pause, Play, Plus, Radio, Search, TriangleAlert } from "lucide-react";
import { agoBn, toBn } from "@/lib/format";
import type { SourceLite } from "@/lib/data";

const KIND_BN: Record<string, string> = { page: "পেজ", group: "গ্রুপ" };
const STATUS_BN: Record<string, string> = {
  watching: "পর্যবেক্ষণ",
  paused: "বিরতি",
  error: "ত্রুটি",
};

export default function Watchlist({ sources }: { sources: SourceLite[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "page" | "group">("all");
  const [paused, setPaused] = useState<Record<number, boolean>>({});
  const [extra, setExtra] = useState<SourceLite[]>([]);
  const [form, setForm] = useState({ name: "", fbId: "", kind: "page" as "page" | "group" });
  const [open, setOpen] = useState(false);

  const all = [...sources, ...extra];
  const shown = useMemo(
    () =>
      all.filter((s) => {
        const st = paused[s.id] ? "paused" : s.status;
        const matchQ =
          q.trim() === "" ||
          s.name.includes(q.trim()) ||
          s.handle.toLowerCase().includes(q.trim().toLowerCase());
        const matchK = kind === "all" || s.kind === kind;
        return matchQ && matchK && (st === s.status || true);
      }),
    [all, q, kind, paused],
  );

  const add = () => {
    if (!form.name.trim() || !form.fbId.trim()) return;
    const id = 900 + extra.length;
    setExtra((xs) => [
      ...xs,
      {
        id,
        name: form.name.trim(),
        kind: form.kind,
        fbId: form.fbId.trim(),
        handle: form.name.trim().replace(/\s+/g, "-").toLowerCase(),
        topics: "নতুন",
        lastChecked: new Date().toISOString(),
        lastPostAt: null,
        status: "watching",
        postsToday: 0,
        health: 100,
        note: "ম্যানুয়ালি যোগ · ডেমো",
      },
    ]);
    setForm({ name: "", fbId: "", kind: "page" });
    setOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <p className="font-serif-bn text-[17px] font-bold text-white">ওয়াচলিস্ট</p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/35 uppercase">
          PUBLIC PAGES · GROUPS · GRAPH READ
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <Search size={12} className="text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="পেজ / হ্যান্ডেল…"
              className="w-40 bg-transparent text-[12px] text-white/85 outline-none placeholder:text-white/30"
            />
          </div>
          {(["all", "page", "group"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                kind === k ? "bg-white text-night" : "text-white/50 hover:bg-white/8"
              }`}
            >
              {k === "all" ? "সব" : KIND_BN[k]}
            </button>
          ))}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-[11.5px] font-bold text-night"
          >
            <Plus size={13} /> সোর্স
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-2 border-b border-white/8 bg-white/[0.03] px-5 py-3 sm:grid-cols-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="পেজের নাম"
            className="rounded-lg border border-white/10 bg-night px-3 py-2 text-[12px] text-white outline-none"
          />
          <input
            value={form.fbId}
            onChange={(e) => setForm({ ...form, fbId: e.target.value })}
            placeholder="Facebook ID"
            className="rounded-lg border border-white/10 bg-night px-3 py-2 font-mono-x text-[12px] text-white outline-none"
          />
          <select
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as "page" | "group" })
            }
            className="rounded-lg border border-white/10 bg-night px-3 py-2 text-[12px] text-white outline-none"
          >
            <option value="page">পেজ</option>
            <option value="group">গ্রুপ</option>
          </select>
          <button
            onClick={add}
            className="rounded-lg bg-lime text-[12px] font-bold text-night"
          >
            ওয়াচলিস্টে যোগ
          </button>
        </div>
      )}

      <div className="scroll-slim flex-1 overflow-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="px-5 py-3 font-medium">সোর্স</th>
              <th className="px-3 py-3 font-medium">ধরন</th>
              <th className="px-3 py-3 font-medium">বিষয়</th>
              <th className="px-3 py-3 font-medium">শেষ চেক</th>
              <th className="px-3 py-3 font-medium">আজ</th>
              <th className="px-3 py-3 font-medium">হেলথ</th>
              <th className="px-5 py-3 text-right font-medium">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {shown.map((s) => {
              const isPaused = paused[s.id] ?? s.status === "paused";
              const st = s.status === "error" ? "error" : isPaused ? "paused" : "watching";
              return (
                <tr key={s.id} className="group hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-semibold text-white/90">{s.name}</p>
                    <p className="font-mono-x text-[10px] text-white/35">
                      {s.handle} · {s.fbId}
                    </p>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-white/60">
                    {KIND_BN[s.kind]}
                  </td>
                  <td className="px-3 py-3.5 text-[11.5px] text-white/55">{s.topics}</td>
                  <td className="px-3 py-3.5 font-mono-x text-[11px] text-white/50">
                    {agoBn(s.lastChecked)}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[12px] text-white/80">
                    {toBn(s.postsToday)}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                        <span
                          className={`block h-full ${
                            s.health > 80
                              ? "bg-lime"
                              : s.health > 50
                                ? "bg-amberx"
                                : "bg-rose-400"
                          }`}
                          style={{ width: `${s.health}%` }}
                        />
                      </span>
                      <span className="font-mono-x text-[10px] text-white/40">
                        {toBn(s.health)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {st === "error" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300">
                          <TriangleAlert size={10} /> {STATUS_BN.error}
                        </span>
                      )}
                      {st !== "error" && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                            st === "watching"
                              ? "bg-lime/15 text-lime"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          <Radio size={10} /> {STATUS_BN[st]}
                        </span>
                      )}
                      {st !== "error" && (
                        <button
                          onClick={() =>
                            setPaused((m) => ({ ...m, [s.id]: !isPaused }))
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 hover:text-white"
                          title={isPaused ? "চালু" : "বিরতি"}
                        >
                          {isPaused ? <Play size={11} /> : <Pause size={11} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

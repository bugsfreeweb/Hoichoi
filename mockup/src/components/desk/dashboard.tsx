"use client";

import {
  Inbox,
  Newspaper,
  Fingerprint,
  Timer,
  Radio,
  Activity,
  Cpu,
  Camera,
  Sparkles,
  GitBranch,
} from "lucide-react";
import Countdown from "@/components/countdown";
import { toBn, bnTime, CATEGORY_LABEL } from "@/lib/format";
import type { ArticleLite, LogLite, RunLite, SourceLite } from "@/lib/data";

const LEVEL: Record<string, string> = {
  ok: "log-ok",
  warn: "log-warn",
  err: "log-err",
  info: "log-info",
};

export default function DeskDashboard({
  articles,
  runs,
  sources,
  logs,
  onOpen,
}: {
  articles: ArticleLite[];
  runs: RunLite[];
  sources: SourceLite[];
  logs: LogLite[];
  onOpen: (tab: string) => void;
}) {
  const last = runs[0] ?? null;
  const published = articles.filter((a) => a.status === "published").length;
  const collected = runs.reduce((s, r) => s + r.collected, 0);
  const dups = runs.reduce((s, r) => s + r.duplicates, 0);
  const avg = runs.length
    ? Math.round(runs.reduce((s, r) => s + r.durationSec, 0) / runs.length)
    : 0;
  const watching = sources.filter((s) => s.status === "watching").length;

  const stats = [
    { label: "আজ সংগৃহীত", value: toBn(collected), icon: Inbox, color: "text-lime" },
    { label: "লাইভ প্রকাশিত", value: toBn(published), icon: Newspaper, color: "text-sky-300" },
    { label: "ডুপ্লিকেট ব্লক", value: toBn(dups), icon: Fingerprint, color: "text-amberx" },
    {
      label: "গড় রান",
      value: `${toBn(Math.floor(avg / 60))}ম ${toBn(String(avg % 60).padStart(2, "0"))}সে`,
      icon: Timer,
      color: "text-rose-300",
    },
  ];

  return (
    <div className="scroll-slim h-full space-y-4 overflow-auto p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-x text-[9.5px] tracking-[0.26em] text-lime uppercase">
            TAURI CONTROLLER · OPTION A · LIVE
          </p>
          <h2 className="mt-1 font-serif-bn text-[26px] font-black text-white">
            ডেস্ক মনিটর
          </h2>
        </div>
        <button
          onClick={() => onOpen("collector")}
          className="flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-[12px] font-bold text-night transition-all hover:brightness-110"
        >
          <Radio size={13} /> কালেক্টর খুলুন
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel rounded-xl p-4">
            <div className="flex items-center justify-between text-[11.5px] text-white/50">
              {s.label}
              <s.icon size={14} className={s.color} />
            </div>
            <p className="mt-2 font-serif-bn text-[26px] leading-none font-black text-white">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="panel relative overflow-hidden rounded-xl p-5 lg:col-span-4">
          <p className="font-mono-x text-[9.5px] tracking-[0.22em] text-lime uppercase">
            পরবর্তী সিঙ্ক · 0 */2 * * *
          </p>
          <div className="mt-4">
            <Countdown lastRunIso={last?.startedAt ?? null} size={108} dark />
          </div>
          <div className="mt-5 space-y-2 border-t border-white/8 pt-4 font-mono-x text-[10.5px] text-white/45">
            <div className="flex justify-between">
              <span>LAST RUN</span>
              <span className="text-white/80">{last ? bnTime(last.startedAt) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>RESULT</span>
              <span className="text-lime">
                {last
                  ? `+${toBn(last.published)} live · ${toBn(last.duplicates)} dup`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>WATCHING</span>
              <span>
                {toBn(watching)}/{toBn(sources.length)} সোর্স
              </span>
            </div>
          </div>
        </div>

        <div className="panel rounded-xl p-5 lg:col-span-4">
          <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.22em] text-white/40 uppercase">
            <Cpu size={11} className="text-amberx" /> পাইপলাইন স্বাস্থ্য
          </p>
          <ul className="mt-4 space-y-3">
            {[
              { icon: Camera, t: "Playwright শট", s: "1440×900 · headless", ok: true },
              { icon: Fingerprint, t: "Dedup গেট", s: "SHA-256 + SimHash 0.87", ok: true },
              { icon: Sparkles, t: "LLM ফ্যাক্ট-গেট", s: "থ্রেশহোল্ড ০.৯০", ok: true },
              { icon: GitBranch, t: "GitHub → Vercel", s: "hoichoi-content · READY", ok: true },
            ].map((n) => (
              <li key={n.t} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-lime">
                  <n.icon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-white/90">{n.t}</p>
                  <p className="font-mono-x text-[9.5px] text-white/35">{n.s}</p>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              </li>
            ))}
          </ul>
        </div>

        <div className="panel rounded-xl p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.22em] text-white/40 uppercase">
              <Radio size={11} className="text-sky-300" /> সোর্স হেলথ
            </p>
            <button
              onClick={() => onOpen("watchlist")}
              className="text-[11px] font-semibold text-lime hover:underline"
            >
              সব →
            </button>
          </div>
          <ul className="mt-4 space-y-2.5">
            {sources.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.status === "watching"
                      ? "bg-lime"
                      : s.status === "paused"
                        ? "bg-white/30"
                        : "bg-rose-400"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/80">
                  {s.name}
                </span>
                <span className="font-mono-x text-[9.5px] text-white/35">
                  {toBn(s.health)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.2em] text-white/40 uppercase">
              <Activity size={11} /> সর্বশেষ কালেক্টর
            </p>
            <button
              onClick={() => onOpen("collector")}
              className="text-[11px] font-semibold text-lime"
            >
              লাইভ লগ →
            </button>
          </div>
          <ul className="divide-y divide-white/6 font-mono-x text-[11px]">
            {logs.slice(0, 6).map((l) => (
              <li key={l.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="shrink-0 text-white/30">{bnTime(l.ts)}</span>
                <span className={`w-14 shrink-0 ${LEVEL[l.level] ?? "log-info"}`}>
                  {l.stage}
                </span>
                <span className="min-w-0 truncate text-white/70">{l.message}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel overflow-hidden rounded-xl">
          <div className="border-b border-white/8 px-4 py-3 font-mono-x text-[9.5px] tracking-[0.2em] text-white/40 uppercase">
            সাম্প্রতিক কিউ
          </div>
          <ul className="divide-y divide-white/6">
            {articles.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-mono-x text-[10px] text-white/30">
                  {String(a.id).padStart(3, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">
                  {a.title}
                </span>
                <span className="hidden text-[10.5px] text-white/40 sm:inline">
                  {CATEGORY_LABEL[a.category]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono-x text-[9px] uppercase ${
                    a.status === "published"
                      ? "bg-lime/15 text-lime"
                      : a.status === "pending"
                        ? "bg-amberx/15 text-amberx"
                        : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

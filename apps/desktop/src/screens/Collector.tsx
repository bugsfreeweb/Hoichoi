"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Square, Radio } from "lucide-react";
import { bnTime, toBn } from "../lib/format";
import { parseLogLine } from "../lib/logs";
import type { DeskStats } from "../lib/tauri";

export default function Collector({
  logs,
  running,
  onStart,
  onStop,
  statsData,
  nextRunAt,
  autoRun,
  onAutoRun,
}: {
  logs: string[];
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  statsData?: DeskStats | null;
  nextRunAt?: number | null;
  autoRun?: boolean;
  onAutoRun?: (v: boolean) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Array<{ ts: string; stage: string; message: string; level: "ok" | "warn" | "err" | "info" }>>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setLive(logs.slice(-400).map((l) => parseLogLine(l)));
  }, [logs]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [live.length]);

  // Derive stat values from DeskStats when provided
  const stats = statsData?.stats;
  const statValue = stats
    ? `${Math.floor(stats.avgRunDurationSec / 60)}ম ${String(stats.avgRunDurationSec % 60).padStart(2, "0")}sce`
    : "—";

  const cnt = nextRunAt ? Math.max(0, nextRunAt - now) : 0;
  const countdown = cnt > 0
    ? `${String(Math.floor(cnt / 3_600_000)).padStart(2, "0")}:${String(Math.floor((cnt % 3_600_000) / 60_000)).padStart(2, "0")}:${String(Math.floor((cnt % 60_000) / 1000)).padStart(2, "0")}`
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <p className="flex items-center gap-2 font-serif-bn text-[17px] font-bold text-white">
          <Radio size={16} className={running ? "text-lime" : "text-white/50"} />
          কালেক্টর
        </p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/35 uppercase">
          PLAYWRIGHT · HASH · LLM · GIT
        </span>
        <div className="ml-auto flex items-center gap-2">
          {autoRun != null && onAutoRun && (
            <label className="flex items-center gap-2 text-[11px] text-white/50" title="প্রতি pipeline_hours ব্যবধানে স্বয়ংক্রিয় রান">
              <span>অটো-রান</span>
              <button
                onClick={() => onAutoRun(!autoRun)}
                className={`relative h-4.5 w-8 rounded-full transition-colors ${autoRun ? "bg-lime" : "bg-white/15"}`}
                style={{ height: 18 }}
              >
                <span
                  className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-night transition-all"
                  style={{ left: autoRun ? 16 : 2 }}
                />
              </button>
            </label>
          )}
          {countdown && !running && (
            <span className="font-mono-x text-[10.5px] text-lime/90" title="পরবর্তী স্বয়ংক্রিয় রানের কাউন্টডাউন">
              ⟳ পরবর্তী রান {countdown}
            </span>
          )}
          {running && (
            <span className="font-mono-x text-[10px] text-live">
              ● LIVE · রান চলছে
            </span>
          )}
          {running ? (
            <button onClick={onStop} className="flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-3 py-1.5 text-[11.5px] font-bold text-rose-300">
              <Square size={11} /> থামান
            </button>
          ) : (
            <button onClick={onStart} className="flex items-center gap-1.5 rounded-lg bg-lime px-3.5 py-1.5 text-[11.5px] font-bold text-night">
              <Play size={12} /> এখনই রান করুন
            </button>
          )}
        </div>
      </div>

      {running && (
        <div className="h-0.5 bg-white/10">
          <div className="indeterminate-bar h-full" />
        </div>
      )}

      <div className="mt-4 text-center text-white/50">
        {statsData && (
          <>
            <p>{toBn(stats?.collectedToday ?? 0)} সংগৃহীত আজ</p>
            <p>{toBn(stats?.published ?? 0)} লাইভ প্রকাশিত</p>
            <p>ডুপ্লিকেট ব্লকড: {toBn(stats?.duplicatesBlocked ?? 0)}</p>
            <p>গড় রান: {statValue}</p>
          </>
        )}
        {!(statsData || live.length > 0) && <p>এখনো কোনো রান হয়নি — সাইডবারে "Run pipeline" চালু করুন।</p>}
      </div>

      <div className="scroll-slim relative flex-1 overflow-auto bg-[#07090d]">
        {running && <div className="scan-line absolute inset-x-0 h-24" />}
        <ul className="px-5 py-3 font-mono-x text-[11px] leading-[1.9]">
          {live.map((l, i) => (
            <li key={`${l.ts}-${i}`} className="flex gap-3">
              <span className="w-[72px] shrink-0 text-white/30">{bnTime(l.ts)}</span>
              <span className={`w-14 shrink-0 font-semibold log-${l.level}`}>{l.stage}</span>
              <span className="text-white/75">{l.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
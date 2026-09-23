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
}: {
  logs: string[];
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  statsData?: DeskStats | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Array<{ ts: string; stage: string; message: string; level: "ok" | "warn" | "err" | "info" }>>([]);

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
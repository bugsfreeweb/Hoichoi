import { useRef, useState, useEffect } from "react";
import { Play, Square, Radio } from "lucide-react";
import { bnTime } from "../lib/format";
import { parseLogLine } from "../lib/logs";

export default function Collector({
  logs,
  running,
  onStart,
  onStop,
}: {
  logs: string[];
  running: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<ReturnType<typeof parseLogLine>[]>([]);

  useEffect(() => {
    setLive(logs.slice(-400).map((l) => parseLogLine(l)));
  }, [logs]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [live.length]);

  const lines = [...live].reverse();

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
            <span className="font-mono-x text-[10px] text-lime">
              ● LIVE · রান চলছে
            </span>
          )}
          {running ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-3 py-1.5 text-[11.5px] font-bold text-rose-300"
            >
              <Square size={11} /> থামান
            </button>
          ) : (
            <button
              onClick={onStart}
              className="flex items-center gap-1.5 rounded-lg bg-lime px-3.5 py-1.5 text-[11.5px] font-bold text-night"
            >
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

      <div ref={scroller} className="scroll-slim relative flex-1 overflow-auto bg-[#07090d]">
        {running && <div className="scan-line absolute inset-x-0 h-24" />}
        {lines.length === 0 && (
          <p className="px-5 py-6 font-mono-x text-[12px] text-white/35">
            এখনো কোনো লগ নেই — "এখনই রান করুন" চাপলে লাইভ আউটপুট এখানে আসবে।
          </p>
        )}
        <ul className="px-5 py-3 font-mono-x text-[12px] leading-[1.9]">
          {lines.map((l, i) => (
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
"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Radio } from "lucide-react";
import { bnTime } from "@/lib/format";
import type { LogLite } from "@/lib/data";

const SCRIPT: Omit<LogLite, "id" | "ts">[] = [
  { level: "info", stage: "CRON", message: "ম্যানুয়াল রান শুরু · Asia/Dhaka" },
  { level: "info", stage: "WATCH", message: "ওয়াচলিস্ট স্ক্যান · ১০ সোর্স" },
  { level: "ok", stage: "FETCH", message: "মিরপুর আপডেট · ২টি নতুন পোস্ট" },
  { level: "ok", stage: "FETCH", message: "ঢাকা ট্রাফিক অ্যালার্ট · ১টি ভিডিও" },
  { level: "info", stage: "SHOT", message: "Playwright headless · 1440×900" },
  { level: "ok", stage: "SHOT", message: "screenshot saved · shot_0012.png · 1.1s" },
  { level: "ok", stage: "HASH", message: "sha256 7c91e2ab · NEW" },
  { level: "warn", stage: "DEDUP", message: "simhash 0.91 · নিকট-দ্বৈত · BLOCK" },
  { level: "ok", stage: "DEDUP", message: "দ্বিতীয় আইটেম পাস · cosine 0.44" },
  { level: "info", stage: "LLM", message: "gpt-4o-mini · style-guide v2.4 · temp 0.3" },
  { level: "ok", stage: "LLM", message: "পুনর্লিখন সম্পন্ন · fact-gate 0.94" },
  { level: "ok", stage: "GIT", message: "commit 3fa91c · hoichoi-content/main" },
  { level: "ok", stage: "SHIP", message: "Web READY · 7.8s · ISR revalidate" },
  { level: "ok", stage: "DONE", message: "রান শেষ · +১ প্রকাশিত · ১ ডুপ্লিকেট ব্লক" },
];

const COLOR: Record<string, string> = {
  ok: "log-ok",
  warn: "log-warn",
  err: "log-err",
  info: "log-info",
};

export default function Collector({ logs }: { logs: LogLite[] }) {
  const [live, setLive] = useState<LogLite[]>(logs);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [live.length]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = () => {
    if (running) return;
    setRunning(true);
    setStep(0);
    let i = 0;
    timer.current = setInterval(() => {
      const row = SCRIPT[i];
      if (!row) {
        if (timer.current) clearInterval(timer.current);
        setRunning(false);
        return;
      }
      setLive((xs) => [
        {
          id: Date.now() + i,
          ts: new Date().toISOString(),
          ...row,
        },
        ...xs,
      ]);
      i += 1;
      setStep(i);
    }, 720);
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    setRunning(false);
  };

  const pct = running ? Math.round((step / SCRIPT.length) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <p className="flex items-center gap-2 font-serif-bn text-[17px] font-bold text-[var(--ds-t1)]">
          <Radio size={16} className={running ? "text-[var(--ds-acc)]" : "text-[var(--ds-t5)]"} />
          কালেক্টর
        </p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-[var(--ds-t5)] uppercase">
          PLAYWRIGHT · HASH · LLM · GIT
        </span>
        <div className="ml-auto flex items-center gap-2">
          {running && (
            <span className="font-mono-x text-[10px] text-[var(--ds-acc)]">
              STAGE {String(step).padStart(2, "0")}/{String(SCRIPT.length).padStart(2, "0")}
            </span>
          )}
          {running ? (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--ds-rose-bd)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--ds-rose)]"
            >
              <Square size={11} /> থামান
            </button>
          ) : (
            <button
              onClick={start}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--ds-acc)] px-3.5 py-1.5 text-[11.5px] font-bold text-[var(--ds-active-tx)]"
            >
              <Play size={12} /> এখনই রান করুন
            </button>
          )}
        </div>
      </div>

      {running && (
        <div className="h-0.5 bg-[var(--ds-kb10)]">
          <div
            className="h-full bg-[var(--ds-acc)] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div ref={scroller} className="scroll-slim relative flex-1 overflow-auto bg-[#07090d]">
        {running && <div className="scan-line pointer-events-none absolute inset-x-0 h-24" />}
        <ul className="px-5 py-3 font-mono-x text-[12px] leading-[1.9]">
          {live.map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="w-[72px] shrink-0 text-white/30">{bnTime(l.ts)}</span>
              <span className={`w-14 shrink-0 font-semibold ${COLOR[l.level] ?? "log-info"}`}>
                {l.stage}
              </span>
              <span className="text-white/75">{l.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import { CheckCircle2, Clock, Database, Play, Radio, ShieldAlert, Square } from "lucide-react";
import { bnTime, toBn } from "../lib/format";
import { parseLogLine } from "../lib/logs";
import type { DeskQueueRow, DeskRadarSnapshot, DeskStats } from "../lib/tauri";
import CollectorRadar from "../components/CollectorRadar";

type RadarStageId = "published" | "queued" | "collected" | "duplicate";

const STAGE_META: Array<{ id: RadarStageId; label: string; var: string }> = [
  { id: "published", label: "প্রকাশিত", var: "var(--ds-acc)" },
  { id: "queued", label: "কিউ অপেক্ষমাণ", var: "var(--ds-amber)" },
  { id: "collected", label: "সংগৃহীত", var: "var(--ds-sky)" },
  { id: "duplicate", label: "ডুপ্লিকেট", var: "var(--ds-rose)" },
];

function Kpi({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-bd)] bg-[var(--color-panel-bg)] p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--ds-t5)]">
        <span>{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="font-serif-bn text-[22px] font-black leading-tight text-[var(--ds-t1)]">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[var(--ds-t5)]">{hint}</div>}
    </div>
  );
}

export default function Collector({
  logs,
  running,
  onStart,
  onStop,
  statsData,
  nextRunAt,
  autoRun,
  onAutoRun,
  radarData,
  queueRows,
}: {
  logs: string[];
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  statsData?: DeskStats | null;
  nextRunAt?: number | null;
  autoRun?: boolean;
  onAutoRun?: (v: boolean) => void;
  radarData?: DeskRadarSnapshot | null;
  queueRows?: DeskQueueRow[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Array<{ ts: string; stage: string; message: string; level: "ok" | "warn" | "err" | "info"; line: string }>>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setLive(logs.slice(-400).map((l) => ({ ...parseLogLine(l), line: l })));
  }, [logs]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [live.length]);

  const stats = statsData?.stats;
  const statValue = stats
    ? `${Math.floor(stats.avgRunDurationSec / 60)}ম ${String(stats.avgRunDurationSec % 60).padStart(2, "0")}sce`
    : "—";
  const durHint = stats ? `গড় রান: ${statValue}` : null;

  const cnt = nextRunAt ? Math.max(0, nextRunAt - now) : 0;
  const countdown = cnt > 0
    ? `${String(Math.floor(cnt / 3_600_000)).padStart(2, "0")}:${String(Math.floor((cnt % 3_600_000) / 60_000)).padStart(2, "0")}:${String(Math.floor((cnt % 60_000) / 1000)).padStart(2, "0")}`
    : null;

  const radarTotals = radarData?.totals;
  const catRows = (radarData?.categories ?? []).map((c) => {
    const stages = STAGE_META.map((st) => radarData?.stages?.[st.id]?.[c.slug] ?? 0);
    const total = stages.reduce((a, b) => a + b, 0);
    return { ...c, stages, total };
  });
  const catMax = Math.max(1, ...catRows.map((c) => c.total));

  const feed = (queueRows ?? []).slice(0, 12);

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

      {/* Radar + side stats */}
      <div className="flex min-h-0 flex-1 gap-3 px-4 pb-3 pt-3">
        <div className="min-w-0 flex-1">
          <CollectorRadar data={radarData} latestQueue={queueRows} running={running} />
        </div>

        <aside className="scroll-slim flex w-[330px] shrink-0 flex-col gap-3 overflow-y-auto pr-0.5">
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi
              label="আজ সংগৃহীত"
              value={toBn(stats?.collectedToday ?? 0)}
              icon={<Database size={15} className="text-[var(--ds-sky)]" />}
              accent="var(--ds-sky)"
            />
            <Kpi
              label="মোট সংগৃহীত"
              value={toBn(radarTotals?.collected ?? 0)}
              icon={<Database size={15} className="text-[var(--ds-sky)]" />}
              accent="var(--ds-sky)"
            />
            <Kpi
              label="লাইভ প্রকাশিত"
              value={toBn(stats?.published ?? 0)}
              icon={<CheckCircle2 size={15} className="text-[var(--ds-acc)]" />}
              accent="var(--ds-acc)"
            />
            <Kpi
              label="ডুপ্লিকেট ব্লকড"
              value={toBn(stats?.duplicatesBlocked ?? 0)}
              icon={<ShieldAlert size={15} className="text-[var(--ds-rose)]" />}
              accent="var(--ds-rose)"
            />
          </div>

          <div className="rounded-lg border border-[var(--color-bd)] bg-[var(--color-panel-bg)]">
            <div className="flex items-center justify-between border-b border-[var(--color-bd)] px-3.5 py-2 text-xs font-semibold text-[var(--ds-t1)]">
              <span className="flex items-center gap-2">
                <Clock size={13} className="text-[var(--ds-sky)]" />
                ক্যাটাগরি অনুযায়ী পাইপলাইন
              </span>
              {durHint && <span className="font-mono-x text-[9.5px] font-normal text-[var(--ds-t5)]">{durHint}</span>}
            </div>
            {catRows.length === 0 ? (
              <p className="px-3.5 py-4 text-center text-[11px] text-[var(--ds-t6)]">
                কোনো ক্যাটাগরি নেই — সোর্স যোগ করা হলে রাডার আপডেট হবে।
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-bd)]/60">
                {catRows.map((c) => (
                  <div key={c.slug} className="px-3.5 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold" style={{ color: c.dot }}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.dot }} />
                        {c.name}
                      </span>
                      <span className="text-[var(--ds-t1)]">
                        {toBn(c.total)}{" "}
                        <span className="text-[10px] text-[var(--ds-t5)]">
                          ({Math.round((c.total / catMax) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded bg-[var(--color-field-bg)]">
                      {STAGE_META.map((st, si) => (
                        <div
                          key={st.id}
                          style={{ width: c.total > 0 ? `${(c.stages[si] / c.total) * 100}%` : "0%", background: st.var }}
                        />
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9.5px] text-[var(--ds-t5)]">
                      {STAGE_META.map((st, si) => (
                        <span key={st.id} className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-sm" style={{ background: st.var }} />
                          {st.label} {toBn(c.stages[si])}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-h-[180px] flex-1 flex-col rounded-lg border border-[var(--color-bd)] bg-[var(--color-panel-bg)]">
            <div className="flex items-center justify-between border-b border-[var(--color-bd)] px-3.5 py-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-[var(--ds-t1)]">
                <Radio size={14} className="text-[#10B981]" />
                রিসেন্ট কনটেন্ট
              </span>
              <span className="text-[10px] text-[var(--ds-t5)]">সর্বশেষ {toBn(feed.length)}টি</span>
            </div>
            {feed.length === 0 ? (
              <p className="flex flex-1 items-center justify-center px-4 text-center text-[11px] text-[var(--ds-t6)]">
                এখনো কোনো রান হয়নি — "এখনই রান করুন" চাপুন অথবা সাইডবার থেকে রান চালান।
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-bd)]/40">
                {feed.map((r) => (
                  <div key={r.id} className="px-3 py-1.5">
                    <div className="line-clamp-1 text-xs text-[var(--ds-t1)]">{r.title_bn}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                      <span
                        className="shrink-0 rounded px-1"
                        style={{ color: radarData?.categories.find((c) => c.slug === r.category)?.dot ?? "var(--ds-t5)" }}
                      >
                        {radarData?.categories.find((c) => c.slug === r.category)?.name ?? r.category}
                      </span>
                      <span className="truncate text-[var(--ds-t5)]">{r.source_name}</span>
                      <span className="ml-auto shrink-0 text-[var(--ds-t6)]">{bnTime(r.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Live log console */}
      <div className="relative h-[190px] shrink-0 border-t border-white/8 bg-[#07090d]">
        <div className="flex items-center gap-2 px-4 py-1.5 font-mono-x text-[9px] tracking-[0.2em] text-white/40 uppercase">
          <span className={running ? "text-lime" : ""}>
            {running ? "● LIVE কনসোল" : "লাইভ কনসোল"}
          </span>
          <span className="text-white/25">· শেষ {toBn(live.length)} লাইন</span>
        </div>
        {live.length === 0 && (
          <p className="px-5 text-[11px] text-white/30">কনসোল খালি — প্রথম রানে এখানে লগ আসবে।</p>
        )}
        <div ref={scroller} className="scroll-slim absolute inset-x-0 bottom-0 top-7 overflow-auto">
          {running && <div className="scan-line absolute inset-x-0 h-24" />}
          <ul className="px-4 py-2 font-mono-x text-[11px] leading-[1.9]">
            {live.map((l, i) => (
              <li key={`${l.ts}-${i}`} className="flex gap-3">
                <span className="w-[72px] shrink-0 text-white/30">{bnTime(l.ts)}</span>
                <span className={`w-14 shrink-0 font-semibold log-${l.level}`}>{l.stage}</span>
                <span className="truncate text-white/75" title={l.line}>
                  {l.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
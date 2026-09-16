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
  BarChart3,
} from "lucide-react";
import Countdown from "../components/Countdown";
import { toBn, bnTime, CATEGORY_LABEL } from "../lib/format";
import { parseLogLine } from "../lib/logs";
import type { DeskQueueRow, DeskSource, DeskStats } from "../lib/tauri";
import type { View } from "../App";

export default function Dashboard({
  sources,
  queueRows,
  statsData,
  logs,
  onOpen,
  hours = 2,
}: {
  sources: DeskSource[];
  queueRows: DeskQueueRow[];
  statsData: DeskStats | null;
  logs: string[];
  onOpen: (tab: View) => void;
  hours?: number;
}) {
  const last = statsData?.runs?.[0] ?? null;
  const st = statsData?.stats;
  const watching = sources.filter((s) => s.is_active).length;

  const stats = [
    { label: "আজ সংগৃহীত", value: toBn(st?.collectedToday ?? 0), icon: Inbox, color: "text-lime" },
    { label: "লাইভ প্রকাশিত", value: toBn(st?.published ?? 0), icon: Newspaper, color: "text-sky-300" },
    { label: "ডুপ্লিকেট ব্লক", value: toBn(st?.duplicatesBlocked ?? 0), icon: Fingerprint, color: "text-amberx" },
    {
      label: "গড় রান",
      value: `${toBn(Math.floor((st?.avgRunDurationSec ?? 0) / 60))}ম ${toBn(String((st?.avgRunDurationSec ?? 0) % 60).padStart(2, "0"))}সে`,
      icon: Timer,
      color: "text-rose-300",
    },
  ];

  return (
    <div className="scroll-slim h-full space-y-4 overflow-auto p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-x text-[9.5px] tracking-[0.26em] text-lime uppercase">
            TAURI CONTROLLER · LIVE
          </p>
          <h2 className="mt-1 font-serif-bn text-[26px] font-black text-white">ডেস্ক মনিটর</h2>
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
            পরবর্তী সিঙ্ক · 0 */{toBn(hours)} * * *
          </p>
          <div className="mt-4">
            <Countdown lastRunIso={last?.started_at ?? null} hours={hours} size={108} />
          </div>
          <div className="mt-5 space-y-2 border-t border-white/8 pt-4 font-mono-x text-[10.5px] text-white/45">
            <div className="flex justify-between">
              <span>LAST RUN</span>
              <span className="text-white/80">{last ? bnTime(last.started_at) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>RESULT</span>
              <span className={last?.status === "completed" ? "text-lime" : "text-amberx"}>
                {last ? String(last.status) : "—"}
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
              { icon: GitBranch, t: "AI Agent → Web", s: "hoichoi-content · READY", ok: true },
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
            {sources.length === 0 && (
              <li className="py-6 text-center text-[12px] text-white/35">
                কোনো সোর্স নেই — ওয়াচলিস্টে যোগ করুন।
              </li>
            )}
            {sources.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${s.is_active ? "bg-lime" : "bg-white/30"}`}
                />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/80">
                  {s.page_name}
                </span>
                <span className="font-mono-x text-[9.5px] text-white/35">{toBn(s.health)}%</span>
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
            {logs.length === 0 && (
              <li className="px-4 py-6 text-center text-[12px] text-white/35">
                এখনো কোনো রান হয়নি — "Run pipeline" চালু করুন।
              </li>
            )}
            {logs
              .slice(-6)
              .reverse()
              .map((raw, i) => {
                const l = parseLogLine(raw);
                return (
                  <li key={logs.length - i} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="shrink-0 text-white/30">{bnTime(l.ts)}</span>
                    <span className={`w-14 shrink-0 ${`log-${l.level}`}`}>{l.stage}</span>
                    <span className="min-w-0 truncate text-white/70">{l.message}</span>
                  </li>
                );
              })}
          </ul>
        </div>

        <div className="panel overflow-hidden rounded-xl">
          <div className="border-b border-white/8 px-4 py-3 font-mono-x text-[9.5px] tracking-[0.2em] text-white/40 uppercase">
            সাম্প্রতিক কিউ
          </div>
          <ul className="divide-y divide-white/6">
            {queueRows.length === 0 && (
              <li className="px-4 py-6 text-center text-[12px] text-white/35">
                এখনো কোনো কনটেন্ট নেই।
              </li>
            )}
            {queueRows.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-mono-x text-[10px] text-white/30">
                  {toBn(a.id.slice(0, 4).toUpperCase())}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">
                  {a.title_bn}
                </span>
                <span className="hidden text-[10.5px] text-white/40 sm:inline">
                  {CATEGORY_LABEL[a.category] ?? a.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono-x text-[9px] uppercase ${
                    a.status === "published"
                      ? "bg-lime/15 text-lime"
                      : a.status === "pending_review"
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

      {(() => {
        const chartRuns = (statsData?.runs ?? []).slice(0, 8).reverse();
        const values = chartRuns.map((r) => Number((r.stats as Record<string, unknown> | null)?.published) || 0);
        const maxPub = Math.max(1, ...values);
        return (
          <div className="panel overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.2em] text-white/40 uppercase">
                <BarChart3 size={11} className="text-lime" /> সাম্প্রতিক প্রকাশ · ACTIVITY TREND
              </p>
              <span className="font-mono-x text-[9.5px] text-white/35">LAST {toBn(chartRuns.length)} RUNS</span>
            </div>
            {chartRuns.length === 0 ? (
              <p className="px-4 py-10 text-center text-[12px] text-white/35">
                এখনো কোনো রান হয়নি — "Run pipeline" চালু করুন।
              </p>
            ) : (
              <div className="flex items-end gap-2 px-4 py-5">
                {chartRuns.map((r, i) => {
                  const published = values[i] ?? 0;
                  const h = Math.round((published / maxPub) * 100);
                  return (
                    <div key={r.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span className="font-mono-x text-[9px] text-lime">{published > 0 ? toBn(published) : ""}</span>
                      <div className="flex h-16 w-full max-w-[34px] items-end">
                        <div
                          className="w-full rounded-t bg-lime/60 transition-all duration-500 hover:bg-lime"
                          style={{ height: `${Math.max(published > 0 ? 8 : 2, h)}%` }}
                          title={`${bnTime(r.started_at)} · ${toBn(published)} প্রকাশিত`}
                        />
                      </div>
                      <span className="truncate font-mono-x text-[9px] text-white/35">{bnTime(r.started_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
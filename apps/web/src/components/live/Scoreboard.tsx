"use client";

import { useLive } from "./LiveProvider";
import { bn, bnNum, bnPercent, clsx } from "@/lib/live-format";
import type { ScoreboardData } from "@/lib/live-types";

type Variant = "card" | "band" | "mini";

export function useScoreboard(): ScoreboardData | null {
  const { feed } = useLive();
  const sb = feed.event.scoreboard;
  return sb && sb.items.length ? sb : null;
}

export default function Scoreboard({ variant = "card", tone = "default", className }: { variant?: Variant; tone?: "default" | "dark"; className?: string }) {
  const sb = useScoreboard();
  const { feed } = useLive();
  if (!sb) return null;
  const dark = tone === "dark";
  const total = sb.items.reduce((s, i) => s + i.value, 0);
  const sorted = sb.kind === "election" ? [...sb.items].sort((a, b) => b.value - a.value) : sb.items;
  const leader = sorted[0];
  if (!leader) return null;

  if (variant === "mini") {
    let text = "";
    if (sb.kind === "match") text = sb.items.map((i) => `${i.label} ${i.display ?? bn(i.value)}`).join(" — ");
    else if (sb.kind === "election") text = `${leader.label.split("·")[0]?.trim() ?? leader.label} এগিয়ে · ব্যবধান ${bnNum(leader.value - (sorted[1]?.value ?? 0))} ভোট`;
    else text = sb.items.slice(0, 2).map((i) => `${i.label}: ${i.display ?? bn(i.value)}`).join(" · ");
    return <p className={clsx("font-mono-x text-[11px] tracking-[0.06em] tabular", dark ? "text-white/80" : "text-ink/80", className)}>{text}</p>;
  }

  if (variant === "band") {
    return (
      <div className={clsx("flex flex-wrap items-stretch divide-x", dark ? "divide-white/10 text-white" : "divide-ink/10 text-ink", className)}>
        <div className="flex items-center pr-5">
          <p className={clsx("font-mono-x text-[9.5px] tracking-[0.22em] uppercase", dark ? "text-[#c8f65d]" : "text-alizarin")}>▚ {sb.title}</p>
        </div>
        {sb.kind === "election" ? (
          <div className="min-w-[260px] flex-1 px-5 py-1">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              {sorted.map((i) => (
                <span key={i.label} style={{ width: `${(i.value / Math.max(1, total)) * 100}%`, background: i.color ?? "#999" }} />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
              {sorted.map((i) => (
                <span key={i.label} className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-full" style={{ background: i.color }} />
                  {i.label.split("·")[0]?.trim() ?? i.label} <b className="font-mono-x tabular">{bnPercent(i.value, total, 1)}</b>
                </span>
              ))}
            </div>
          </div>
        ) : (
          sb.items.map((i) => (
            <div key={i.label} className="flex items-center gap-3 px-5 py-1">
              <span className="h-8 w-1" style={{ background: i.color ?? "currentColor" }} />
              <div>
                <p className={clsx("text-[11px]", dark ? "text-white/55" : "text-ink-soft")}>{i.label}</p>
                <p className="font-display text-[20px] leading-none font-bold tabular">
                  {i.display ?? bnNum(i.value)}
                  {i.sub && <span className={clsx("ml-1.5 font-sans text-[11px] font-medium", dark ? "text-white/50" : "text-ink-soft")}>{i.sub}</span>}
                </p>
              </div>
            </div>
          ))
        )}
        {sb.note && (
          <div className="flex items-center pl-5">
            <p className={clsx("font-serif-bn text-[13px] font-bold", dark ? "text-[#ffb454]" : "text-alizarin")}>{sb.note}</p>
          </div>
        )}
      </div>
    );
  }

  // ---- card
  return (
    <div className={clsx(className)}>
      <div className="flex items-center justify-between gap-3">
        <p className={clsx("font-mono-x text-[9.5px] tracking-[0.22em] uppercase", dark ? "text-[#c8f65d]" : "text-alizarin")}>▚ {sb.title}</p>
        {feed.event.status === "live" && (
          <span className={clsx("font-mono-x text-[9px] tracking-[0.18em] uppercase", dark ? "text-white/40" : "text-ink-soft")}>স্বয়ংক্রিয় আপডেট</span>
        )}
      </div>

      {sb.kind === "match" && (
        <div className="mt-3 space-y-2">
          {sb.items.map((i, idx) => {
            const batting = idx === sb.items.length - 1 && feed.event.status === "live";
            return (
              <div key={i.label} className={clsx("flex items-center justify-between gap-3 border-l-[3px] py-2 pr-1 pl-3", dark ? "bg-white/[0.04]" : "bg-ink/[0.03]")} style={{ borderColor: i.color ?? "currentColor" }}>
                <div className="flex items-center gap-2">
                  <span className={clsx("font-serif-bn text-[16px] font-bold", dark ? "text-white" : "text-ink")}>{i.label}</span>
                  {batting && <span className="rounded-sm bg-live px-1.5 py-0.5 font-mono-x text-[8.5px] font-bold tracking-[0.14em] text-white">ব্যাটিং</span>}
                </div>
                <div className="text-right">
                  <p className={clsx("font-display text-[24px] leading-none font-bold tabular", dark ? "text-white" : "text-ink")}>{i.display ?? bn(i.value)}</p>
                  {i.sub && <p className={clsx("mt-0.5 font-mono-x text-[10px]", dark ? "text-white/50" : "text-ink-soft")}>{i.sub}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sb.kind === "election" && (
        <div className="mt-3 space-y-3">
          {sorted.map((i, idx) => (
            <div key={i.label}>
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className={clsx("font-semibold", dark ? "text-white" : "text-ink")}>
                  {i.label}
                  {idx === 0 && <span className="ml-2 bg-lime px-1.5 py-0.5 font-mono-x text-[8.5px] font-bold tracking-[0.12em] text-paper">এগিয়ে</span>}
                </span>
                <span className={clsx("font-mono-x text-[11.5px] font-bold tabular", dark ? "text-white" : "text-ink")}>
                  {bnNum(i.value)} <span className="font-normal opacity-60">· {bnPercent(i.value, total, 1)}</span>
                </span>
              </div>
              <div className={clsx("mt-1.5 h-2 overflow-hidden", dark ? "bg-white/10" : "bg-ink/10")}>
                <div className="h-full transition-[width] duration-700" style={{ width: `${(i.value / Math.max(1, leader.value)) * 100}%`, background: i.color ?? "#888" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {sb.kind === "metrics" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {sb.items.map((i) => (
            <div key={i.label} className={clsx("relative overflow-hidden p-3", dark ? "bg-white/[0.04]" : "bg-ink/[0.035]")}>
              <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: i.color ?? "currentColor" }} />
              <p className={clsx("text-[11.5px]", dark ? "text-white/55" : "text-ink-soft")}>{i.label}</p>
              <p className={clsx("mt-1 font-display text-[21px] leading-tight font-bold tabular", dark ? "text-white" : "text-ink")}>{i.display ?? bnNum(i.value)}</p>
              {i.sub && <p className={clsx("mt-0.5 text-[11px]", dark ? "text-white/45" : "text-ink-soft")}>{i.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {typeof sb.progress === "number" && (
        <div className="mt-4">
          <div className={clsx("flex justify-between font-mono-x text-[9.5px] tracking-[0.14em] uppercase", dark ? "text-white/45" : "text-ink-soft")}>
            <span>{sb.kind === "election" ? "ফল ঘোষিত" : "ম্যাচের অগ্রগতি"}</span>
            <span className="tabular">{bn(sb.progress)}%</span>
          </div>
          <div className={clsx("mt-1.5 h-1.5", dark ? "bg-white/10" : "bg-ink/10")}>
            <div className={clsx("h-full", dark ? "bg-[#c8f65d]" : "bg-lime")} style={{ width: `${sb.progress}%` }} />
          </div>
        </div>
      )}

      {sb.note && <p className={clsx("mt-3 font-serif-bn text-[14px] leading-snug font-bold", dark ? "text-[#ffb454]" : "text-alizarin")}>{sb.note}</p>}

      {sb.meta && sb.meta.length > 0 && (
        <dl className={clsx("mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3", dark ? "border-white/10" : "border-ink/10")}>
          {sb.meta.map((m) => (
            <div key={m.label}>
              <dt className={clsx("font-mono-x text-[9px] tracking-[0.14em] uppercase", dark ? "text-white/40" : "text-ink-soft")}>{m.label}</dt>
              <dd className={clsx("mt-0.5 text-[13px] font-bold tabular", dark ? "text-white" : "text-ink")}>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

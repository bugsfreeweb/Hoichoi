import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { toBn } from "./hooks";
import type { Series } from "./kit";
import type { DashLiveEvent } from "./model";

/* ============================================================ live pulse */

/**
 * Heartbeat for the collector.
 *
 * `intensity` (0–1) drives ring speed and glow, so a fast-moving run looks
 * different from an idle desk. Rings are pure CSS transforms — no JS timer per
 * frame — which keeps the dashboard cheap while it animates continuously.
 */
export function LivePulse({
  running,
  intensity = 0.5,
  label,
  sub,
  size = 96,
}: {
  running: boolean;
  intensity?: number;
  label?: string;
  sub?: string;
  size?: number;
}) {
  const level = Math.max(0.15, Math.min(1, intensity));
  const dur = `${Math.max(1.1, 3.2 - level * 2)}s`;
  const tone = running ? "#34d399" : "#64748b";
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <span
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: `${tone}44`, animation: `rtRipple ${dur} ease-out infinite` }}
        />
        <span
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: `${tone}33`, animation: `rtRipple ${dur} ease-out infinite`, animationDelay: `calc(${dur} / 3)` }}
        />
        <span
          className="absolute inset-[26%] rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${tone}cc, ${tone}22 70%)`,
            boxShadow: running ? `0 0 26px ${tone}66` : "none",
            animation: running ? "rtBreathe 2.4s ease-in-out infinite" : undefined,
          }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: tone, boxShadow: `0 0 12px ${tone}` }}
        />
      </div>
      <div className="min-w-0">
        <p className="mono flex items-center gap-2 text-[9.5px] tracking-[0.2em] uppercase" style={{ color: tone }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone, animation: running ? "rtBlink 1.4s ease-in-out infinite" : undefined }} />
          {running ? "COLLECTOR · LIVE" : "COLLECTOR · IDLE"}
        </p>
        {label && <p className="bn mt-1 text-[14px] font-semibold text-white/90">{label}</p>}
        {sub && <p className="mono mt-0.5 text-[10.5px] text-white/45">{sub}</p>}
      </div>
    </div>
  );
}

/* ============================================================ stream area */

/**
 * A compact area chart with a live edge: the last point keeps a pulsing dot and
 * a moving sweep, so a new sample is visible even when the shape barely changes.
 */
export function StreamArea({
  labels,
  series,
  height = 116,
  showLabels = false,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  showLabels?: boolean;
}) {
  const W = 340;
  const H = 120;
  const padT = 8;
  const padB = showLabels ? 22 : 8;
  const n = Math.max(2, labels.length);
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const X = (i: number) => (i / (n - 1)) * (W - 8) + 4;
  const Y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const dotIndex = Math.max(0, (series[0]?.values.length ?? 1) - 1);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="rt-stream-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color ?? "#22d3ee"} stopOpacity="0.34" />
            <stop offset="100%" stopColor={series[0]?.color ?? "#22d3ee"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
          return (
            <g key={s.name}>
              {si === 0 && (
                <polygon
                  points={`4,${H - padB} ${pts} ${X(s.values.length - 1)},${H - padB}`}
                  fill="url(#rt-stream-fill)"
                />
              )}
              <polyline
                points={pts}
                fill="none"
                stroke={s.color}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.95}
              />
            </g>
          );
        })}
        {series[0]?.values.length ? (
          <circle
            cx={X(dotIndex)}
            cy={Y(series[0]!.values[dotIndex] ?? 0)}
            r="3"
            fill={series[0]!.color}
            className="svg-ping"
          />
        ) : null}
      </svg>
    </div>
  );
}

/* ============================================================ pipeline flow */

export interface FlowStage {
  id: string;
  bn: string;
  value: number;
  color: string;
}

/**
 * Collector pipeline as animated plumbing.
 *
 * Each stage node is sized by its real count and connected by a dashed path with
 * a dot travelling along it; the connectors only animate while a run is live, so
 * motion means "work is flowing right now", not decoration.
 */
export function PipelineFlow({ stages, running }: { stages: FlowStage[]; running: boolean }) {
  const uid = useMemo(() => `flow-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div className="relative overflow-x-auto pb-1">
      <div className="flex min-w-[560px] items-center gap-1.5">
        {stages.map((s, i) => (
          <div key={s.id} className="flex min-w-0 flex-1 items-center gap-1.5">
            <div
              className={cn(
                "relative flex-1 rounded-xl border px-3 py-2.5 transition-colors",
                running ? "border-white/15" : "border-white/8",
              )}
              style={{
                background: running
                  ? `linear-gradient(160deg, ${s.color}22, transparent 65%)`
                  : "rgba(255,255,255,0.03)",
                boxShadow: running ? `inset 0 0 22px ${s.color}1a` : undefined,
              }}
            >
              <p className="mono text-[8.5px] tracking-[0.18em] text-white/40 uppercase">{s.id}</p>
              <p className="bn mt-1 truncate text-[11px] text-white/70">{s.bn}</p>
              <p className="mono mt-1 text-[16px] leading-none font-bold tabular" style={{ color: s.color }}>
                {toBn(s.value)}
              </p>
              {running && (
                <span
                  className="absolute -right-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                  style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }}
                />
              )}
            </div>
            {i < stages.length - 1 && (
              <div className="relative h-px w-6 shrink-0 bg-white/10">
                <svg viewBox="0 0 24 2" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  <line
                    x1="0"
                    y1="1"
                    x2="24"
                    y2="1"
                    stroke={running ? s.color : "rgba(255,255,255,0.25)"}
                    strokeWidth="1.4"
                    strokeDasharray="3 4"
                    className={running ? "dash-flow" : undefined}
                  />
                </svg>
                {running && (
                  <span
                    className="absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
                    style={{
                      background: s.color,
                      animation: "rtTravel 1.8s linear infinite",
                      animationDelay: `${i * 0.22}s`,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mono mt-2 text-[9px] tracking-[0.14em] text-white/28 uppercase">
        {running ? "FLOWING · live run" : "PAUSED · no run in flight"}
        <span className="sr-only">{uid}</span>
      </p>
    </div>
  );
}

/* ============================================================ activity stream */

const KINDS: Record<string, { color: string; icon: string }> = {
  collect: { color: "#22d3ee", icon: "↓" },
  publish: { color: "#34d399", icon: "↑" },
  approve: { color: "#a855f7", icon: "✓" },
  reject: { color: "#fb7185", icon: "×" },
  ad: { color: "#f5a524", icon: "◆" },
  system: { color: "#94a3b8", icon: "·" },
  error: { color: "#fb7185", icon: "!" },
  live: { color: "#ff6b1a", icon: "◉" },
};

function relTime(at: string | null | undefined, now: number): string {
  if (!at) return "";
  const diff = Math.max(0, Math.floor((now - Date.parse(at)) / 1000));
  if (!Number.isFinite(diff)) return "";
  if (diff < 5) return "এখনই";
  if (diff < 60) return `${toBn(diff)} সে আগে`;
  if (diff < 3600) return `${toBn(Math.floor(diff / 60))} মি আগে`;
  if (diff < 86400) return `${toBn(Math.floor(diff / 3600))} ঘ আগে`;
  return `${toBn(Math.floor(diff / 86400))} দিন আগে`;
}

/**
 * The activity feed, ordered newest-first.
 *
 * Rows animate in only when the id set grows: a poll that returns the same
 * events must not replay the entrance animation (that flicker is what makes a
 * live panel feel broken). The first row is marked HOT because it is the newest
 * event, and its relative timestamp ticks with the clock.
 */
export function ActivityStream({
  items,
  limit = 7,
  now,
  empty,
}: {
  items: DashLiveEvent[];
  limit?: number;
  now?: number;
  empty?: ReactNode;
}) {
  const clock = useNowMaybe(now);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const shown = items.slice(0, limit);

  useEffect(() => {
    if (shown.length === 0) return;
    const next = new Set(seen);
    for (const it of shown) next.add(it.id);
    if (next.size > 400) {
      setSeen(new Set(shown.map((i) => i.id)));
      return;
    }
    setSeen(next);
    // Only the id set matters; re-running on `seen` would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.map((i) => i.id).join("|")]);

  if (shown.length === 0) {
    return <div className="py-6 text-center text-[12px] text-white/40">{empty ?? "এখনো কোনো কার্যক্রম নেই।"}</div>;
  }

  return (
    <ul className="relative space-y-1.5">
      <span
        aria-hidden
        className="absolute bottom-2 left-[13px] top-2 w-px"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.16), rgba(255,255,255,0.02))" }}
      />
      {shown.map((e, i) => {
        const kind = KINDS[e.kind ?? "system"] ?? KINDS.system!;
        const fresh = i === 0;
        return (
          <li
            key={e.id}
            className={cn(
              "anim-in relative flex items-start gap-3 rounded-lg py-1.5 pl-8 pr-2 transition-colors hover:bg-white/[0.03]",
              fresh && "bg-white/[0.025]",
            )}
            style={{ animationDelay: seen.has(e.id) ? "0ms" : `${i * 40}ms` }}
          >
            <span
              className="absolute left-[7px] top-[9px] grid h-[13px] w-[13px] place-items-center rounded-full text-[8px] font-bold"
              style={{ background: `${kind.color}22`, color: kind.color, boxShadow: fresh ? `0 0 8px ${kind.color}66` : undefined }}
            >
              {kind.icon}
            </span>
            <span className="bn min-w-0 flex-1 truncate text-[12px] leading-relaxed text-white/75">{e.text}</span>
            <span className="mono shrink-0 pt-0.5 text-[9.5px] text-white/30">{relTime(e.at, clock)}</span>
            {fresh && <span className="h-1 w-1 shrink-0 animate-pulse rounded-full" style={{ background: kind.color }} />}
          </li>
        );
      })}
    </ul>
  );
}

function useNowMaybe(fixed?: number): number {
  const [now, setNow] = useState(() => fixed ?? Date.now());
  const fixedRef = useRef(fixed);
  fixedRef.current = fixed;
  useEffect(() => {
    if (fixed !== undefined) {
      setNow(fixed);
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [fixed]);
  return now;
}

/* ============================================================ heat grid */

/**
 * Per-bucket activity matrix. Cell brightness is the real value, and the newest
 * column pulses so the reader can see which bucket is "now".
 */
export function HeatGrid({
  values,
  columns = 24,
  color = "#22d3ee",
  height = 34,
}: {
  values: number[];
  columns?: number;
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  const cells = values.slice(-columns);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {cells.map((v, i) => {
        const pct = v / max;
        const isLast = i === cells.length - 1;
        return (
          <span
            key={i}
            title={`${v}`}
            className={cn("flex-1 rounded-[2px]", isLast && pct > 0 && "animate-pulse")}
            style={{
              height: `${Math.max(8, pct * 100)}%`,
              background: v > 0 ? color : "rgba(255,255,255,0.07)",
              opacity: v > 0 ? 0.35 + pct * 0.65 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

/* ============================================================ live number */

/**
 * A metric that flashes when it changes. The previous value is kept for one
 * animation cycle so the delta reads as motion, not a silent re-render.
 */
export function LiveNumber({
  value,
  color = "#e8ecf5",
  size = 26,
  suffix = "",
}: {
  value: number;
  color?: string;
  size?: number;
  suffix?: string;
}) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span
      className="mono inline-block font-bold tabular transition-transform"
      style={{
        color,
        fontSize: size,
        textShadow: flash ? `0 0 18px ${color}` : "none",
        transform: flash ? "translateY(-1px) scale(1.03)" : "none",
      }}
    >
      {toBn(value)}
      {suffix}
    </span>
  );
}

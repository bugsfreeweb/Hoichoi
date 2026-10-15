import clsx from "clsx";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/* ───────────────────────── section shell ───────────────────────── */
export function SectionShell({
  id,
  children,
  className,
  density = "comfortable",
  bleed = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  density?: "compact" | "comfortable" | "spacious";
  bleed?: boolean;
}) {
  const pad =
    density === "compact" ? "py-12 md:py-16" : density === "spacious" ? "py-24 md:py-36" : "py-16 md:py-24";
  return (
    <section id={id} className={clsx("relative", pad, className)}>
      <div className={clsx("mx-auto w-full", bleed ? "max-w-[1600px]" : "max-w-[1320px] px-5 md:px-8")}>
        {children}
      </div>
    </section>
  );
}

export function SectionHead({
  kicker,
  title,
  desc,
  right,
  align = "left",
  className,
}: {
  kicker?: string;
  title: ReactNode;
  desc?: ReactNode;
  right?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mb-10 flex flex-col gap-6 md:mb-14",
        right ? "md:flex-row md:items-end md:justify-between" : "",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <div className={clsx("max-w-2xl", align === "center" && "mx-auto")}>
        {kicker ? (
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-8" style={{ background: "var(--accent)" }} />
            <span className="mono-label" style={{ color: "var(--accent)" }}>
              {kicker}
            </span>
          </div>
        ) : null}
        <h2 className="font-display-bn text-3xl leading-[1.25] text-mist-100 md:text-[2.7rem]">{title}</h2>
        {desc ? <p className="mt-3 text-[15px] leading-relaxed text-mist-400">{desc}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* ───────────────────────── badges & chips ───────────────────────── */
export type Tone = "hot" | "ok" | "warn" | "cool" | "mute" | "violet";

const TONES: Record<Tone, string> = {
  hot: "text-ember-400 border-ember-500/35 bg-ember-500/10",
  ok: "text-mint-400 border-mint-500/35 bg-mint-500/10",
  warn: "text-gold-400 border-gold-500/35 bg-gold-500/10",
  cool: "text-azure-400 border-azure-500/35 bg-azure-500/10",
  violet: "text-violet-400 border-violet-400/35 bg-violet-400/10",
  mute: "text-mist-300 border-white/12 bg-white/[0.04]",
};

export function Badge({
  children,
  tone = "mute",
  className,
  mono = true,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        mono ? "mono-label" : "text-[12px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ tone = "ok", className }: { tone?: "ok" | "warn" | "hot" | "cool"; className?: string }) {
  const color = tone === "ok" ? "#4ade80" : tone === "warn" ? "#f5a524" : tone === "hot" ? "#ff5c38" : "#56c8ff";
  return (
    <span className={clsx("relative inline-flex h-2 w-2", className)}>
      <span className="pulse-live absolute inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

/* ───────────────────────── buttons ───────────────────────── */
export function Btn({
  href,
  children,
  variant = "primary",
  className,
  icon = true,
  onClick,
}: {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline" | "solid";
  className?: string;
  icon?: boolean;
  onClick?: () => void;
}) {
  const styles = clsx(
    "sheen group relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition-all duration-300",
    variant === "primary" &&
      "text-ink-950 hover:brightness-110 active:scale-[0.97]",
    variant === "solid" && "bg-mist-100 text-ink-950 hover:bg-white",
    variant === "outline" && "border hairline text-mist-100 hover:border-white/30 hover:bg-white/[0.05]",
    variant === "ghost" && "text-mist-300 hover:text-mist-100",
    className,
  );
  const inner = (
    <>
      <span>{children}</span>
      {icon ? (
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      ) : null}
    </>
  );
  if (href) {
    const external = href.startsWith("http");
    const style = variant === "primary" ? { background: "var(--accent)" } : undefined;
    return external ? (
      <a href={href} target="_blank" rel="noreferrer noopener" className={styles} style={style}>
        {inner}
      </a>
    ) : (
      <Link href={href} className={styles} style={style} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={styles}
      style={variant === "primary" ? { background: "var(--accent)" } : undefined}
    >
      {inner}
    </button>
  );
}

/* ───────────────────────── sparkline ───────────────────────── */
export function Sparkline({
  data,
  className,
  color = "var(--accent)",
  fill = true,
  height = 34,
  width = 120,
  strokeWidth = 1.6,
}: {
  data: number[];
  className?: string;
  color?: string;
  fill?: boolean;
  height?: number;
  width?: number;
  strokeWidth?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const gid = `sp-${Math.round(width)}-${data.length}-${Math.round(max)}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={clsx("overflow-visible", className)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill ? <path d={area} fill={`url(#${gid})`} /> : null}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ───────────────────────── heatmap ───────────────────────── */
export function Heatmap({
  rows,
  className,
}: {
  rows: { day: string; hour: number; value: number }[][];
  className?: string;
}) {
  const max = Math.max(...rows.flat().map((c) => c.value), 1);
  return (
    <div className={clsx("w-full overflow-x-auto", className)}>
      <div className="min-w-[520px]">
        {rows.map((row, ri) => (
          <div key={ri} className="mb-[3px] flex items-center gap-[3px]">
            <span className="mono-label w-8 shrink-0 text-right text-mist-400">{row[0].day}</span>
            {row.map((cell) => {
              const t = cell.value / max;
              return (
                <div
                  key={cell.hour}
                  title={`${cell.day} ${cell.hour}:00 — ${cell.value}`}
                  className="h-[15px] flex-1 rounded-[3px] transition-transform duration-200 hover:scale-[1.25]"
                  style={{
                    background: `color-mix(in srgb, var(--accent) ${Math.round(12 + t * 88)}%, #10141e)`,
                    opacity: 0.25 + t * 0.75,
                  }}
                />
              );
            })}
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between">
          <span className="mono-label text-mist-400">০০:০০</span>
          <span className="mono-label text-mist-400">২৩:০০</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── funnel ───────────────────────── */
export function Funnel({
  stages,
  className,
}: {
  stages: { stage: string; key: string; count: number; pct: number; note: string }[];
  className?: string;
}) {
  return (
    <div className={clsx("space-y-2.5", className)}>
      {stages.map((s, i) => (
        <div key={s.key} className="group relative">
          <div className="flex items-center gap-3">
            <span className="mono-label w-14 shrink-0 text-right text-mist-400">{s.key}</span>
            <div className="relative h-11 flex-1 overflow-hidden rounded-md bg-white/[0.03]">
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-all duration-700 group-hover:brightness-125"
                style={{
                  width: `${s.pct}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, var(--accent) ${88 - i * 11}%, #f5a524), color-mix(in srgb, var(--accent) ${40 - i * 5}%, #10141e))`,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)",
                }}
              />
              <div className="relative flex h-full items-center justify-between px-3">
                <span className="text-[13px] font-semibold text-mist-100">{s.stage}</span>
                <span className="mono-label text-mist-100/90">
                  {s.count} · {s.pct}%
                </span>
              </div>
            </div>
          </div>
          <p className="mono-label mt-1 pl-[68px] text-mist-400/70">{s.note}</p>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── stat tile ───────────────────────── */
export function StatTile({
  label,
  value,
  delta,
  tone = "hot",
  spark,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: Tone;
  spark?: number[];
  className?: string;
}) {
  return (
    <div className={clsx("surface card-lift group relative overflow-hidden rounded-xl p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono-label text-mist-400">{label}</p>
          <p className="mt-2 font-latin text-3xl font-bold leading-none text-mist-100">{value}</p>
        </div>
        {delta ? <Badge tone={tone}>{delta}</Badge> : null}
      </div>
      {spark ? (
        <div className="mt-4 h-9">
          <Sparkline data={spark} className="h-9 w-full" />
        </div>
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
        style={{ background: "var(--accent)" }}
      />
    </div>
  );
}

/* ───────────────────────── empty / hidden marker ───────────────────────── */
export function HiddenSectionNote({ label }: { label: string }) {
  return (
    <div className="mx-auto my-8 max-w-xl rounded-xl border border-dashed border-white/12 bg-white/[0.02] p-5 text-center">
      <p className="mono-label text-mist-400">SECTION HIDDEN</p>
      <p className="mt-2 text-sm text-mist-300">{label}</p>
    </div>
  );
}

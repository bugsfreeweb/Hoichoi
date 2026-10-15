import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { useCountUp, fmt } from "../lib/hooks";
import { Sparkline } from "./charts";

export function Card({
  children,
  className,
  delay = 0,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  pad?: boolean;
}) {
  return (
    <div
      className={cn("panel panel-hover glow-ring anim-in", pad && "p-5", className)}
      style={{ animationDelay: `${delay}ms` }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

export function CardHead({
  bn,
  en,
  right,
  icon,
}: {
  bn: string;
  en?: string;
  right?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/5 text-[13px]">
            {icon}
          </span>
        )}
        <div>
          <h3 className="bn text-[14.5px] font-semibold leading-tight text-white/92">{bn}</h3>
          {en && <p className="mono mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-white/35">{en}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  dot,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info" | "brand";
  dot?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/12 bg-white/5 text-white/60",
    good: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    warn: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    bad: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    info: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    brand: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-medium tracking-wide",
        tones[tone],
      )}
    >
      {dot && <span className="relative h-1.5 w-1.5 rounded-full bg-current pulse-ring" />}
      {children}
    </span>
  );
}

export function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
        up ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300",
      )}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" className={up ? "" : "rotate-180"}>
        <path d="M5 1 L9 8 L1 8 Z" fill="currentColor" />
      </svg>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function KpiCard({
  bn,
  en,
  value,
  delta,
  color,
  spark,
  suffix = "",
  delay = 0,
}: {
  bn: string;
  en: string;
  value: number;
  delta: number;
  color: string;
  spark: number[];
  suffix?: string;
  delay?: number;
}) {
  const v = useCountUp(value, 1500);
  return (
    <Card delay={delay} className="overflow-hidden">
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full opacity-25 blur-3xl aurora"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="bn text-[12.5px] text-white/55">{bn}</p>
            <p className="mono mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/28">{en}</p>
          </div>
          <Delta value={delta} />
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="mono text-[30px] font-bold leading-none tabular text-white">
            {fmt(Math.round(v))}
            <span className="ml-0.5 text-sm text-white/40">{suffix}</span>
          </div>
          <Sparkline values={spark} color={color} width={110} height={38} />
        </div>
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${55 + Math.min(40, Math.abs(delta) * 2)}%`, background: color, boxShadow: `0 0 10px ${color}` }}
          />
        </div>
      </div>
    </Card>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.name} className="flex items-center gap-1.5 text-[10.5px] text-white/50">
          <span className="h-2 w-2 rounded-sm" style={{ background: i.color, boxShadow: `0 0 8px ${i.color}99` }} />
          <span className="bn">{i.name}</span>
        </span>
      ))}
    </div>
  );
}

export function SegMent<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "mono relative z-10 rounded-[6px] px-2.5 py-1 text-[10px] font-medium transition-all duration-300",
            value === o ? "bg-amber-brand/90 text-ink-950 shadow-[0_0_14px_rgba(245,165,36,0.45)]" : "text-white/45 hover:text-white/80",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="bn text-white/65">{label}</span>
        <span className="mono text-white/45">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

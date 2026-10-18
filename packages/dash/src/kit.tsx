import { useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { useCountUp, useProgress, fmt } from "./hooks";

/* ============================================================ primitives */

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
          <h3 className="bn text-[14.5px] leading-tight font-semibold text-white/92">{bn}</h3>
          {en && <p className="mono mt-0.5 text-[9.5px] tracking-[0.14em] text-white/35 uppercase">{en}</p>}
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
      {dot && <span className="pulse-ring relative h-1.5 w-1.5 rounded-full bg-current" />}
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
  hint,
  delay = 0,
}: {
  bn: string;
  en: string;
  value: number;
  delta: number;
  color: string;
  spark: number[];
  suffix?: string;
  hint?: string;
  delay?: number;
}) {
  const v = useCountUp(value, 1500);
  return (
    <Card delay={delay} className="overflow-hidden">
      <div
        className="aurora pointer-events-none absolute -top-14 -right-10 h-36 w-36 rounded-full opacity-25 blur-3xl"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="bn text-[12.5px] text-white/55">{bn}</p>
            <p className="mono mt-0.5 text-[9px] tracking-[0.16em] text-white/28 uppercase">{en}</p>
          </div>
          <Delta value={delta} />
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="mono tabular text-[30px] leading-none font-bold text-white">
            {fmt(Math.round(v))}
            <span className="ml-0.5 text-sm text-white/40">{suffix}</span>
          </div>
          <Sparkline values={spark.length > 1 ? spark : [0, 0]} color={color} width={110} height={38} />
        </div>
        {hint && <p className="bn mt-2 text-[10.5px] text-white/40">{hint}</p>}
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${55 + Math.min(40, Math.abs(delta) * 2)}%`,
              background: color,
              boxShadow: `0 0 10px ${color}`,
            }}
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
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "mono relative z-10 rounded-[6px] px-2.5 py-1 text-[10px] font-medium transition-all duration-300",
            value === o
              ? "bg-amber-brand/90 text-ink-950 shadow-[0_0_14px_rgba(245,165,36,0.45)]"
              : "text-white/45 hover:text-white/80",
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
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="bn grid place-items-center rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-[12px] text-white/40">
      {children}
    </div>
  );
}

/* ============================================================== geometry */

export function smoothPath(pts: [number, number][]) {
  if (pts.length === 0) return "";
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p0 = pts[i - 1] ?? p1;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function polar(cx: number, cy: number, r: number, a: number): [number, number] {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  return `M ${x0} ${y0} A ${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function Tooltip({ x, children }: { x: number; children: ReactNode }) {
  return (
    <div
      className="anim-fade bg-ink-900/95 pointer-events-none absolute top-2 z-20 -translate-x-1/2 rounded-xl border border-white/10 px-3 py-2 text-[11px] shadow-2xl backdrop-blur-md"
      style={{ left: `clamp(70px, ${x * 100}%, calc(100% - 70px))` }}
    >
      {children}
    </div>
  );
}

/* =========================================================== area chart */

export type Series = { name: string; color: string; values: number[] };

export function AreaChart({
  labels,
  series,
  stacked = false,
  height = 260,
  unit = "",
}: {
  labels: string[];
  series: Series[];
  stacked?: boolean;
  height?: number;
  unit?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const key = useMemo(() => labels.length + "|" + series.map((s) => s.name).join() + stacked, [labels, series, stacked]);
  const p = useProgress(1100, key);
  const [hover, setHover] = useState<number | null>(null);

  const W = 760;
  const H = 280;
  const L = 46;
  const R = 16;
  const T = 18;
  const B = 32;
  const iw = W - L - R;
  const ih = H - T - B;
  const n = labels.length;

  const tops = stacked
    ? series.map((_, si) => labels.map((__, i) => series.slice(0, si + 1).reduce((a, s) => a + (s.values[i] ?? 0), 0)))
    : series.map((s) => s.values);
  const max = Math.max(1, ...tops.flat()) * 1.15;

  const X = (i: number) => L + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const Y = (v: number) => T + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const stepPct = n <= 1 ? 1 : 1 / (n - 1);

  return (
    <div
      className="relative w-full"
      style={{ height }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const rel = (e.clientX - r.left) / r.width;
        const inner = (rel * W - L) / iw;
        setHover(Math.max(0, Math.min(n - 1, Math.round(inner * (n - 1)))));
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`${uid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={stacked ? 0.65 : 0.42} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
          <clipPath id={`${uid}-clip`}>
            <rect x="0" y="0" width={L + iw * p + 2} height={H} />
          </clipPath>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="rgba(255,255,255,0.07)" strokeDasharray={i ? "3 6" : ""} />
            <text x={L - 10} y={Y(t) + 4} textAnchor="end" className="mono" fontSize="10" fill="#5d6679">
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        ))}

        {labels.map((lb, i) =>
          n <= 14 || i % Math.ceil(n / 10) === 0 ? (
            <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#5d6679" className="bn">
              {lb}
            </text>
          ) : null,
        )}

        <g clipPath={`url(#${uid}-clip)`}>
          {[...series].reverse().map((s, ri) => {
            const si = series.length - 1 - ri;
            const topPts = tops[si]!.map((v, i) => [X(i), Y(v)] as [number, number]);
            const basePts = stacked && si > 0 ? tops[si - 1]!.map((v, i) => [X(i), Y(v)] as [number, number]) : null;
            const area = basePts
              ? `${smoothPath(topPts)} L ${basePts[basePts.length - 1]![0]} ${basePts[basePts.length - 1]![1]} ${smoothPath([...basePts].reverse()).replace("M", "L")} Z`
              : `${smoothPath(topPts)} L ${X(n - 1)} ${T + ih} L ${X(0)} ${T + ih} Z`;
            return (
              <g key={s.name}>
                <path d={area} fill={`url(#${uid}-g${si})`} />
                <path
                  d={smoothPath(topPts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  filter={`url(#${uid}-glow)`}
                  opacity={0.95}
                />
              </g>
            );
          })}
        </g>

        {series.map((s, si) => (
          <circle key={si} cx={X(n - 1)} cy={Y(tops[si]![n - 1]!)} r={3.4} fill={s.color} opacity={p} />
        ))}

        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={T} y2={T + ih} stroke="rgba(255,255,255,0.28)" strokeDasharray="4 4" />
            {series.map((s, si) => (
              <circle key={si} cx={X(hover)} cy={Y(tops[si]![hover]!)} r="5" fill="#0a0c12" stroke={s.color} strokeWidth="2.5" />
            ))}
          </g>
        )}
      </svg>

      {hover !== null && (
        <Tooltip x={(L + (n <= 1 ? iw / 2 : hover * stepPct * iw)) / W}>
          <div className="bn mb-1 text-[11px] font-semibold text-white/90">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-2 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="bn text-white/55">{s.name}</span>
              <span className="mono ml-auto font-semibold text-white">
                {fmt(s.values[hover] ?? 0)}
                {unit}
              </span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ============================================================ bar chart */

export function BarChart({
  labels,
  series,
  stacked = false,
  height = 250,
}: {
  labels: string[];
  series: Series[];
  stacked?: boolean;
  height?: number;
}) {
  const p = useProgress(950, labels.length + series.length + +stacked);
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 260;
  const L = 42;
  const R = 12;
  const T = 16;
  const B = 30;
  const iw = W - L - R;
  const ih = H - T - B;
  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const max = Math.max(1, ...(stacked ? totals : series.flatMap((s) => s.values))) * 1.15;
  const band = iw / n;
  const bw = stacked ? band * 0.5 : (band * 0.62) / series.length;
  const Y = (v: number) => T + ih - (v / max) * ih;

  return (
    <div className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={Y(max * t)} y2={Y(max * t)} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 6" />
            <text x={L - 8} y={Y(max * t) + 4} textAnchor="end" fontSize="10" fill="#5d6679" className="mono">
              {Math.round(max * t)}
            </text>
          </g>
        ))}
        {labels.map((lb, i) => {
          const cx = L + band * i + band / 2;
          let acc = 0;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={L + band * i} y={T} width={band} height={ih} fill={hover === i ? "rgba(255,255,255,0.045)" : "transparent"} />
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                const full = (v / max) * ih;
                const h = full * p;
                let x: number;
                let y: number;
                if (stacked) {
                  x = cx - bw / 2;
                  y = T + ih - (acc + full) * p;
                  acc += full;
                } else {
                  x = cx - (bw * series.length) / 2 + si * bw + 1;
                  y = T + ih - h;
                }
                return (
                  <rect
                    key={si}
                    x={x}
                    y={y}
                    width={stacked ? bw : bw - 2}
                    height={Math.max(0, h - (stacked ? 1.5 : 0))}
                    rx={3}
                    fill={s.color}
                    opacity={hover === null || hover === i ? 1 : 0.35}
                    style={{ transition: "opacity .25s ease" }}
                  />
                );
              })}
              <text x={cx} y={H - 10} textAnchor="middle" fontSize="10" fill="#5d6679" className="bn">
                {lb}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={(L + band * hover + band / 2) / W}>
          <div className="bn mb-1 font-semibold text-white/90">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-2 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="bn text-white/55">{s.name}</span>
              <span className="mono ml-auto font-semibold text-white">{fmt(s.values[hover] ?? 0)}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ========================================================== donut chart */

export function DonutChart({
  data,
  size = 230,
  thickness = 26,
  centerLabel,
  centerSub,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const p = useProgress(1100, data.length);
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r1 = size / 2 - 6;
  const r0 = r1 - thickness;
  let a = -Math.PI / 2;

  return (
    <div className="relative" style={{ width: size, height: size }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        <circle cx={cx} cy={cy} r={(r0 + r1) / 2} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const sweep = (d.value / total) * Math.PI * 2 * p;
          const a0 = a;
          const a1 = a + sweep;
          a += (d.value / total) * Math.PI * 2;
          const grow = hover === i ? 4 : 0;
          return (
            <path
              key={i}
              d={arcPath(cx, cy, r0 - grow / 2, r1 + grow, a0, Math.max(a0 + 0.001, a1 - 0.012))}
              fill={d.color}
              opacity={hover === null || hover === i ? 1 : 0.32}
              onMouseEnter={() => setHover(i)}
              style={{ transition: "opacity .25s ease", cursor: "pointer" }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="mono tabular text-2xl font-bold text-white">
          {hover === null ? centerLabel : `${((data[hover]!.value / total) * 100).toFixed(1)}%`}
        </div>
        <div className="bn mt-0.5 max-w-[70%] text-[10px] tracking-wider text-white/45 uppercase">
          {hover === null ? centerSub : data[hover]!.label}
        </div>
      </div>
    </div>
  );
}

/* ========================================================= radial gauges */

export function RadialStack({ data, size = 220 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const p = useProgress(1200, data.length);
  const cx = size / 2;
  const cy = size / 2;
  const gap = 15;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
      {data.map((d, i) => {
        const r = size / 2 - 10 - i * gap;
        const c = 2 * Math.PI * r;
        return (
          <g key={i} transform={`rotate(-90 ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${c * (d.value / 100) * p} ${c}`}
              style={{ filter: `drop-shadow(0 0 6px ${d.color}66)` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function SemiGauge({
  value,
  max = 100,
  label,
  sub,
  color = "#f5a524",
  size = 200,
}: {
  value: number;
  max?: number;
  label: string;
  sub?: string;
  color?: string;
  size?: number;
}) {
  const p = useProgress(1200, value);
  const cx = size / 2;
  const cy = size * 0.62;
  const r = size * 0.4;
  const frac = Math.min(1, value / max) * p;
  const uid = useId().replace(/:/g, "");
  return (
    <div className="relative" style={{ width: size, height: size * 0.76 }}>
      <svg viewBox={`0 0 ${size} ${size * 0.76}`} className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`${uid}-sg`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={arcPath(cx, cy, r - 11, r, Math.PI, Math.PI * 2)} fill="rgba(255,255,255,0.06)" />
        <path
          d={arcPath(cx, cy, r - 11, r, Math.PI, Math.PI + Math.PI * Math.max(0.001, frac))}
          fill={`url(#${uid}-sg)`}
          style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
        />
        {[...Array(21)].map((_, i) => {
          const a = Math.PI + (i / 20) * Math.PI;
          const [x1, y1] = polar(cx, cy, r + 4, a);
          const [x2, y2] = polar(cx, cy, r + (i % 5 === 0 ? 11 : 7), a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.18)" strokeWidth={i % 5 === 0 ? 1.6 : 0.8} />;
        })}
        {(() => {
          const a = Math.PI + Math.PI * frac;
          const [nx, ny] = polar(cx, cy, r - 18, a);
          return (
            <g>
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx={cx} cy={cy} r="5" fill="#0a0c12" stroke={color} strokeWidth="2" />
            </g>
          );
        })()}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="mono text-xl font-bold tabular" style={{ color }}>
          {label}
        </div>
        {sub && <div className="bn text-[10px] tracking-wider text-white/40 uppercase">{sub}</div>}
      </div>
    </div>
  );
}

/* =========================================================== radar chart */

export function RadarChart({
  axes,
  series,
  size = 280,
}: {
  axes: { bn: string }[];
  series: { name: string; color: string; values: number[] }[];
  size?: number;
}) {
  const p = useProgress(1100, series.length);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 38;
  const n = axes.length;
  const ang = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, v: number) => polar(cx, cy, (Math.min(100, v) / 100) * r * p, ang(i));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <polygon
          key={i}
          points={axes.map((_, j) => polar(cx, cy, r * f, ang(j)).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = polar(cx, cy, r, ang(i));
        const [lx, ly] = polar(cx, cy, r + 20, ang(i));
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" />
            <text x={lx} y={ly + 3} textAnchor="middle" fontSize="9.5" fill="#79839a" className="bn">
              {a.bn}
            </text>
          </g>
        );
      })}
      {series.map((s) => (
        <g key={s.name}>
          <polygon
            points={s.values.map((v, i) => pt(i, v).join(",")).join(" ")}
            fill={s.color}
            fillOpacity="0.16"
            stroke={s.color}
            strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 8px ${s.color}44)` }}
          />
          {s.values.map((v, i) => {
            const [x, y] = pt(i, v);
            return <circle key={i} cx={x} cy={y} r="3" fill={s.color} />;
          })}
        </g>
      ))}
    </svg>
  );
}

/* =============================================================== heatmap */

export function Heatmap({ rows, rowLabels }: { rows: number[][]; rowLabels: string[] }) {
  const max = Math.max(1, ...rows.flat());
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  return (
    <div className="w-full">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-[2px]">
          {rowLabels.map((l) => (
            <div key={l} className="bn h-[18px] text-right text-[9.5px] leading-[18px] text-white/35">
              {l}
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}>
            {rows.map((row, d) =>
              row.map((v, h) => {
                const t = v / max;
                return (
                  <div
                    key={`${d}-${h}`}
                    onMouseEnter={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    className="anim-pop h-[15px] rounded-[3px] transition-transform duration-200 hover:scale-[1.35]"
                    style={{
                      background: `rgba(245,165,36,${0.07 + t * 0.9})`,
                      boxShadow: t > 0.75 ? `0 0 8px rgba(245,165,36,${t * 0.5})` : undefined,
                      animationDelay: `${(d * 24 + h) * 3}ms`,
                    }}
                    title={`${rowLabels[d]} ${h}:00 — ${v}`}
                  />
                );
              }),
            )}
          </div>
          <div className="mono mt-1.5 flex justify-between text-[9px] text-white/30">
            {["00", "04", "08", "12", "16", "20", "23"].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="mono mt-3 flex items-center gap-2 text-[9.5px] text-white/35">
        <span className="bn">কম</span>
        {[0.1, 0.3, 0.5, 0.7, 0.95].map((t) => (
          <span key={t} className="h-3 w-5 rounded-[3px]" style={{ background: `rgba(245,165,36,${t})` }} />
        ))}
        <span className="bn">বেশি</span>
        <span className="bn ml-auto">
          {hover ? `${rowLabels[hover.d] ?? ""} · ${String(hover.h).padStart(2, "0")}:00 · ${rows[hover.d]?.[hover.h] ?? 0} রেকর্ড` : "হোভার করুন"}
        </span>
      </div>
    </div>
  );
}

/* ============================================================= sparkline */

export function Sparkline({
  values,
  color,
  width = 120,
  height = 36,
  area = true,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  area?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const p = useProgress(1400, values.length);
  // A sparkline is decoration, and callers legitimately have no data yet (the
  // storage tab on a deploy with no local media, for instance). An empty series
  // used to reach `pts[pts.length - 1]!` and throw, blanking the whole tab with
  // "Application error". Fall back to a flat baseline so the card still renders.
  const series = values.length > 0 ? values : [0, 0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const pts = series.map((v, i) => [
    (i / Math.max(1, series.length - 1)) * width,
    height - 3 - ((v - min) / Math.max(1, max - min)) * (height - 8),
  ]) as [number, number][];
  const d = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`${uid}-sp`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}-spc`}>
          <rect x="0" y="0" width={width * p} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-spc)`}>
        {area && <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${uid}-sp)`} />}
        <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="2.4" fill={color} opacity={p} />
    </svg>
  );
}

/* ========================================================== funnel chart */

export function FunnelChart({
  stages,
}: {
  stages: { id: string; bn: string; value: number; color: string }[];
}) {
  const p = useProgress(1200, stages.length);
  const [hover, setHover] = useState<number | null>(null);
  const W = 420;
  const rowH = 46;
  const H = stages.length * rowH + 10;
  const maxV = Math.max(1, stages[0]?.value ?? 1);
  const w = (v: number) => (v / maxV) * (W - 60) * p + 20;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: H }}>
        {stages.map((s, i) => {
          const y = i * rowH + 6;
          const wTop = w(s.value);
          const wBot = w(stages[i + 1]?.value ?? s.value * 0.94);
          const cx = W / 2;
          const pts = [
            [cx - wTop / 2, y],
            [cx + wTop / 2, y],
            [cx + wBot / 2, y + rowH - 8],
            [cx - wBot / 2, y + rowH - 8],
          ];
          return (
            <g key={s.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <polygon
                points={pts.map((q) => q.join(",")).join(" ")}
                fill={s.color}
                fillOpacity={hover === i ? 0.95 : 0.65}
                stroke={s.color}
                strokeWidth={hover === i ? 1.5 : 0.6}
                style={{ transition: "fill-opacity .25s ease", filter: hover === i ? `drop-shadow(0 0 12px ${s.color}66)` : undefined }}
              />
              <text x={cx} y={y + 22} textAnchor="middle" fontSize="12" fill="#0a0c12" fontWeight="700" className="mono">
                {Math.round(s.value * p)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 space-y-1.5">
        {stages.map((s, i) => {
          const conv = i === 0 ? 100 : (s.value / Math.max(1, stages[i - 1]!.value)) * 100;
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg px-2 py-1 text-[11px] transition-colors"
              style={{ background: hover === i ? "rgba(255,255,255,0.05)" : "transparent" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="mono text-white/30">{s.id}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="bn text-white/80">{s.bn}</span>
              <span className="mono ml-auto font-semibold" style={{ color: conv > 90 ? "#34d399" : conv > 75 ? "#f5a524" : "#fb7185" }}>
                {conv.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================================================== treemap */

type TItem = { label: string; value: number; color: string };
function sliceDice(
  items: TItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  out: (TItem & { x: number; y: number; w: number; h: number })[] = [],
  depth = 0,
) {
  if (!items.length) return out;
  if (items.length === 1 || depth > 32) {
    out.push({ ...items[0]!, x, y, w, h });
    // Depth guard: dump any remainder as zero-size boxes rather than dropping
    // them, so a pathological distribution can never recurse forever.
    for (let i = 1; i < items.length; i++) out.push({ ...items[i]!, x, y, w: 0, h: 0 });
    return out;
  }
  let total = 0;
  for (const it of items) total += Math.max(0, it.value);
  // All-zero (or negative) values made `frac = 0/0 = NaN` and the split never
  // shrank the slice, so sliceDice recursed until the stack overflowed
  // ("Maximum call stack size exceeded") on any dashboard with categories that
  // had no posts yet. Lay the boxes out evenly instead.
  if (total <= 0) {
    const n = items.length;
    if (w >= h) {
      const each = w / n;
      items.forEach((it, i) => out.push({ ...it, x: x + i * each, y, w: each, h }));
    } else {
      const each = h / n;
      items.forEach((it, i) => out.push({ ...it, x, y: y + i * each, w, h: each }));
    }
    return out;
  }
  let acc = 0;
  let idx = 0;
  for (let i = 0; i < items.length; i++) {
    const v = Math.max(0, items[i]!.value);
    if (i > 0 && acc + v > total / 2) break;
    acc += v;
    idx = i + 1;
  }
  // Guarantee a strictly smaller split on both sides (progress ⇒ termination).
  if (idx <= 0) idx = 1;
  if (idx >= items.length) idx = items.length - 1;
  acc = 0;
  for (let i = 0; i < idx; i++) acc += Math.max(0, items[i]!.value);
  const frac = acc / total;
  const first = items.slice(0, idx);
  const second = items.slice(idx);
  if (w >= h) {
    sliceDice(first, x, y, w * frac, h, out, depth + 1);
    sliceDice(second, x + w * frac, y, w * (1 - frac), h, out, depth + 1);
  } else {
    sliceDice(first, x, y, w, h * frac, out, depth + 1);
    sliceDice(second, x, y + h * frac, w, h * (1 - frac), out, depth + 1);
  }
  return out;
}

export function Treemap({ data, height = 230 }: { data: TItem[]; height?: number }) {
  const p = useProgress(900, data.length);
  const [hover, setHover] = useState<string | null>(null);
  const W = 460;
  const H = 240;
  const cells = useMemo(() => sliceDice([...data].sort((a, b) => b.value - a.value), 0, 0, W, H), [data]);
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {cells.map((c, i) => (
        <g
          key={c.label}
          onMouseEnter={() => setHover(c.label)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer", opacity: p, transition: "opacity .4s ease", transitionDelay: `${i * 60}ms` }}
        >
          <rect
            x={c.x + 2}
            y={c.y + 2}
            width={Math.max(0, c.w - 4)}
            height={Math.max(0, c.h - 4)}
            rx="8"
            fill={c.color}
            fillOpacity={hover === c.label ? 0.9 : 0.5}
            stroke={c.color}
            strokeOpacity="0.5"
            style={{ transition: "fill-opacity .25s ease" }}
          />
          {c.w > 56 && c.h > 34 && (
            <>
              <text x={c.x + 12} y={c.y + 24} fontSize="11.5" fill="#fff" fontWeight="600" className="bn">
                {c.label}
              </text>
              <text x={c.x + 12} y={c.y + 40} fontSize="10.5" fill="rgba(255,255,255,0.75)" className="mono">
                {c.value} · {((c.value / total) * 100).toFixed(1)}%
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ========================================================= horizontal bars */

export function RankBars({ data }: { data: { label: string; sub?: string; value: number; color: string }[] }) {
  const p = useProgress(1000, data.length);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label} className="group">
          <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
            <span className="bn text-white/80">{d.label}</span>
            <span className="mono tabular text-white/45">{fmt(d.value)}</span>
          </div>
          {d.sub && <p className="bn mb-1 text-[10px] text-white/35">{d.sub}</p>}
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100 * p}%`,
                background: `linear-gradient(90deg, ${d.color}55, ${d.color})`,
                boxShadow: `0 0 12px ${d.color}55`,
                transitionDelay: `${i * 60}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

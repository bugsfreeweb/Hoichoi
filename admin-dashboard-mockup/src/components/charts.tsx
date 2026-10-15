import { useId, useMemo, useState } from "react";
import { useProgress, fmt } from "../lib/hooks";

/* ------------------------------------------------------------------ utils */

export function smoothPath(pts: [number, number][]) {
  if (pts.length === 0) return "";
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
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

export function Tooltip({
  x,
  children,
  align = "auto",
}: {
  x: number;
  children: React.ReactNode;
  align?: "auto";
}) {
  void align;
  return (
    <div
      className="pointer-events-none absolute top-2 z-20 -translate-x-1/2 rounded-xl border border-white/10 bg-ink-900/95 px-3 py-2 text-[11px] shadow-2xl backdrop-blur-md anim-fade"
      style={{ left: `clamp(70px, ${x * 100}%, calc(100% - 70px))` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- area chart */

export type Series = { name: string; color: string; values: number[] };

export function AreaChart({
  labels,
  series,
  stacked = false,
  height = 260,
  unit = "",
  forecastFrom,
}: {
  labels: string[];
  series: Series[];
  stacked?: boolean;
  height?: number;
  unit?: string;
  forecastFrom?: number;
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

        {forecastFrom !== undefined && (
          <rect
            x={X(forecastFrom)}
            y={T}
            width={W - R - X(forecastFrom)}
            height={ih}
            fill="rgba(168,85,247,0.07)"
          />
        )}

        <g clipPath={`url(#${uid}-clip)`}>
          {[...series].reverse().map((s, ri) => {
            const si = series.length - 1 - ri;
            const topPts = tops[si].map((v, i) => [X(i), Y(v)] as [number, number]);
            const basePts = stacked && si > 0 ? tops[si - 1].map((v, i) => [X(i), Y(v)] as [number, number]) : null;
            const area = basePts
              ? `${smoothPath(topPts)} L ${basePts[basePts.length - 1][0]} ${basePts[basePts.length - 1][1]} ${smoothPath([...basePts].reverse()).replace("M", "L")} Z`
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

        {/* last point pulse */}
        {series.map((s, si) => (
          <circle key={si} cx={X(n - 1)} cy={Y(tops[si][n - 1])} r={3.4} fill={s.color} opacity={p} />
        ))}

        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={T} y2={T + ih} stroke="rgba(255,255,255,0.28)" strokeDasharray="4 4" />
            {series.map((s, si) => (
              <circle key={si} cx={X(hover)} cy={Y(tops[si][hover])} r="5" fill="#0a0c12" stroke={s.color} strokeWidth="2.5" />
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

/* -------------------------------------------------------------- bar chart */

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

/* ------------------------------------------------------------ donut chart */

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
        <div className="mono text-2xl font-bold text-white tabular">
          {hover === null ? centerLabel : `${((data[hover].value / total) * 100).toFixed(1)}%`}
        </div>
        <div className="bn mt-0.5 max-w-[70%] text-[10px] uppercase tracking-wider text-white/45">
          {hover === null ? centerSub : data[hover].label}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- radial gauges */

export function RadialStack({
  data,
  size = 220,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
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
        {sub && <div className="bn text-[10px] uppercase tracking-wider text-white/40">{sub}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ radar chart */

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
  const pt = (i: number, v: number) => polar(cx, cy, (v / 100) * r * p, ang(i));

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

/* --------------------------------------------------------------- heatmap */

export function Heatmap({ rows, rowLabels }: { rows: number[][]; rowLabels: string[] }) {
  const max = Math.max(...rows.flat());
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
        <span>কম</span>
        {[0.1, 0.3, 0.5, 0.7, 0.95].map((t) => (
          <span key={t} className="h-3 w-5 rounded-[3px]" style={{ background: `rgba(245,165,36,${t})` }} />
        ))}
        <span>বেশি</span>
        <span className="ml-auto">
          {hover ? `${rowLabels[hover.d]} · ${String(hover.h).padStart(2, "0")}:00 · ${rows[hover.d][hover.h]} রেকর্ড` : "হোভার করুন"}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- sparkline */

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
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
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
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} opacity={p} />
    </svg>
  );
}

/* ----------------------------------------------------------- funnel chart */

export function FunnelChart({
  stages,
}: {
  stages: { id: string; bn: string; en: string; value: number; color: string; ms: number }[];
}) {
  const p = useProgress(1200, stages.length);
  const [hover, setHover] = useState<number | null>(null);
  const W = 420;
  const rowH = 46;
  const H = stages.length * rowH + 10;
  const maxV = stages[0].value;
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
          const conv = i === 0 ? 100 : (s.value / stages[i - 1].value) * 100;
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
              <span className="mono ml-auto text-white/40">{s.ms}ms</span>
              <span className="mono w-14 text-right font-semibold" style={{ color: conv > 90 ? "#34d399" : conv > 75 ? "#f5a524" : "#fb7185" }}>
                {conv.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- treemap */

type TItem = { label: string; value: number; color: string };
function sliceDice(items: TItem[], x: number, y: number, w: number, h: number, out: (TItem & { x: number; y: number; w: number; h: number })[] = []) {
  if (!items.length) return out;
  if (items.length === 1) {
    out.push({ ...items[0], x, y, w, h });
    return out;
  }
  const total = items.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  let idx = 0;
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && acc + items[i].value > total / 2) break;
    acc += items[i].value;
    idx = i + 1;
  }
  const frac = acc / total;
  const first = items.slice(0, idx);
  const second = items.slice(idx);
  if (w >= h) {
    sliceDice(first, x, y, w * frac, h, out);
    sliceDice(second, x + w * frac, y, w * (1 - frac), h, out);
  } else {
    sliceDice(first, x, y, w, h * frac, out);
    sliceDice(second, x, y + h * frac, w, h * (1 - frac), out);
  }
  return out;
}

export function Treemap({ data, height = 230 }: { data: TItem[]; height?: number }) {
  const p = useProgress(900, data.length);
  const [hover, setHover] = useState<string | null>(null);
  const W = 460;
  const H = 240;
  const cells = useMemo(() => sliceDice([...data].sort((a, b) => b.value - a.value), 0, 0, W, H), [data]);
  const total = data.reduce((a, b) => a + b.value, 0);
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

/* ----------------------------------------------------------- bubble chart */

export function BubbleChart({
  data,
  height = 260,
}: {
  data: { x: number; y: number; r: number; label: string; color: string }[];
  height?: number;
}) {
  const p = useProgress(1100, data.length);
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 280;
  const L = 44;
  const B = 34;
  const maxX = Math.max(...data.map((d) => d.x)) * 1.2;
  const minY = Math.min(...data.map((d) => d.y)) - 6;
  const maxR = Math.max(...data.map((d) => d.r));
  const X = (v: number) => L + (v / maxX) * (W - L - 16);
  const Y = (v: number) => H - B - ((v - minY) / (100 - minY)) * (H - B - 18);
  const R = (v: number) => 8 + (v / maxR) * 26;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - 16} y1={Y(minY + (100 - minY) * t)} y2={Y(minY + (100 - minY) * t)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" />
            <text x={L - 8} y={Y(minY + (100 - minY) * t) + 4} textAnchor="end" fontSize="9.5" fill="#5d6679" className="mono">
              {Math.round(minY + (100 - minY) * t)}%
            </text>
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10].filter((v) => v <= maxX).map((v) => (
          <text key={v} x={X(v)} y={H - 12} textAnchor="middle" fontSize="9.5" fill="#5d6679" className="mono">
            {v}s
          </text>
        ))}
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
            <circle cx={X(d.x)} cy={Y(d.y)} r={R(d.r) * p} fill={d.color} fillOpacity={hover === i ? 0.45 : 0.2} stroke={d.color} strokeWidth="1.8" />
            <circle cx={X(d.x)} cy={Y(d.y)} r="2.6" fill={d.color} />
          </g>
        ))}
        <text x={W / 2} y={H + 4} textAnchor="middle" fontSize="9" fill="#444c5e" className="mono">
          LATENCY (s) →
        </text>
      </svg>
      {hover !== null && (
        <Tooltip x={X(data[hover].x) / W}>
          <div className="bn font-semibold text-white">{data[hover].label}</div>
          <div className="mono text-white/55">
            {data[hover].y}% ok · {data[hover].x}s · {data[hover].r} posts
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* -------------------------------------------------------- waterfall chart */

export function Waterfall({ data, height = 230 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  const p = useProgress(1000, data.length);
  const W = 460;
  const H = 240;
  const L = 40;
  const B = 36;
  const ih = H - B - 20;
  let run = 0;
  const steps = data.map((d) => {
    const start = run;
    run += d.value;
    return { ...d, start, end: run };
  });
  const total = run;
  const max = Math.max(total, ...steps.map((s) => Math.max(s.start, s.end))) * 1.15;
  const band = (W - L - 16) / (data.length + 1);
  const Y = (v: number) => 20 + ih - (v / max) * ih;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <line x1={L} x2={W - 16} y1={Y(0)} y2={Y(0)} stroke="rgba(255,255,255,0.14)" />
      {steps.map((s, i) => {
        const x = L + band * i + band * 0.18;
        const bw = band * 0.64;
        const top = Y(Math.max(s.start, s.end));
        const h = Math.abs(Y(s.start) - Y(s.end)) * p;
        return (
          <g key={s.label}>
            <rect x={x} y={s.value >= 0 ? Y(s.end) + (Math.abs(Y(s.start) - Y(s.end)) - h) : top} width={bw} height={Math.max(1, h)} rx="4" fill={s.color} fillOpacity="0.85" />
            <text x={x + bw / 2} y={Y(Math.max(s.start, s.end)) - 6} textAnchor="middle" fontSize="10" fill={s.color} className="mono">
              {s.value > 0 ? "+" : ""}
              {s.value}
            </text>
            <text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="9" fill="#5d6679" className="bn">
              {s.label}
            </text>
            {i < steps.length - 1 && (
              <line x1={x + bw} x2={L + band * (i + 1) + band * 0.18} y1={Y(s.end)} y2={Y(s.end)} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
            )}
          </g>
        );
      })}
      <rect x={L + band * data.length + band * 0.18} y={Y(total)} width={band * 0.64} height={(Y(0) - Y(total)) * p} rx="4" fill="#e8ecf5" fillOpacity="0.9" />
      <text x={L + band * data.length + band * 0.5} y={Y(total) - 6} textAnchor="middle" fontSize="10" fill="#e8ecf5" className="mono">
        ${total}
      </text>
      <text x={L + band * data.length + band * 0.5} y={H - 14} textAnchor="middle" fontSize="9" fill="#5d6679" className="bn">
        মোট
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------ candlestick */

export function Candlestick({
  data,
  height = 230,
}: {
  data: { label: string; o: number; h: number; l: number; c: number }[];
  height?: number;
}) {
  const p = useProgress(900, data.length);
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 240;
  const L = 42;
  const B = 28;
  const lo = Math.min(...data.map((d) => d.l)) * 0.97;
  const hi = Math.max(...data.map((d) => d.h)) * 1.03;
  const Y = (v: number) => 14 + (H - B - 14) - ((v - lo) / (hi - lo)) * (H - B - 14);
  const band = (W - L - 14) / data.length;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 14} y1={Y(lo + (hi - lo) * t)} y2={Y(lo + (hi - lo) * t)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" />
            <text x={L - 8} y={Y(lo + (hi - lo) * t) + 4} textAnchor="end" fontSize="9.5" fill="#5d6679" className="mono">
              {Math.round(lo + (hi - lo) * t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + band * i + band / 2;
          const up = d.c >= d.o;
          const col = up ? "#34d399" : "#fb7185";
          const yTop = Y(Math.max(d.o, d.c));
          const bh = Math.max(2, Math.abs(Y(d.o) - Y(d.c))) * p;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === i ? 1 : 0.4}>
              <line x1={cx} x2={cx} y1={Y(d.h)} y2={Y(d.l)} stroke={col} strokeWidth="1.3" opacity={p} />
              <rect x={cx - band * 0.24} y={yTop + (Math.abs(Y(d.o) - Y(d.c)) - bh)} width={band * 0.48} height={bh} rx="2" fill={col} fillOpacity={up ? 0.85 : 0.75} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="#5d6679" className="bn">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={(L + band * hover + band / 2) / W}>
          <div className="bn font-semibold text-white">{data[hover].label}</div>
          <div className="mono text-white/60">
            O {data[hover].o} · H {data[hover].h} · L {data[hover].l} · C {data[hover].c}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------- horizontal bars */

export function RankBars({ data }: { data: { label: string; sub?: string; value: number; color: string }[] }) {
  const p = useProgress(1000, data.length);
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label} className="group">
          <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
            <span className="bn text-white/80">{d.label}</span>
            <span className="mono tabular text-white/45">{fmt(d.value)}</span>
          </div>
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

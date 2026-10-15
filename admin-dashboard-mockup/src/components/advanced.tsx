import { useId, useState } from "react";
import { Tooltip, arcPath, polar, smoothPath, type Series } from "./charts";
import { fmt, useInterval, useProgress } from "../lib/hooks";
import { palette } from "../lib/data";
import { cn } from "../utils/cn";

/* ================================================================ SANKEY */

export type SankeyNode = { id: string; label: string; col: number; color: string };
export type SankeyLink = { from: string; to: string; value: number };

export function Sankey({
  nodes,
  links,
  width = 760,
  height = 330,
}: {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const p = useProgress(1300, links.length);
  const [hover, setHover] = useState<string | null>(null);

  const padX = 150;
  const nw = 12;
  const top = 36;
  const bottom = height - 12;
  const gapY = 12;
  const cols = Math.max(...nodes.map((n) => n.col)) + 1;

  const inV = new Map<string, number>();
  const outV = new Map<string, number>();
  links.forEach((l) => {
    outV.set(l.from, (outV.get(l.from) ?? 0) + l.value);
    inV.set(l.to, (inV.get(l.to) ?? 0) + l.value);
  });
  const nodeVal = (id: string) => Math.max(inV.get(id) ?? 0, outV.get(id) ?? 0);

  let k = Infinity;
  for (let c = 0; c < cols; c++) {
    const ns = nodes.filter((n) => n.col === c);
    const tot = ns.reduce((a, n) => a + nodeVal(n.id), 0);
    if (tot > 0) k = Math.min(k, (bottom - top - (ns.length - 1) * gapY) / tot);
  }
  if (!isFinite(k)) k = 1;

  const xOf = (c: number) => (cols === 1 ? width / 2 : padX + (c / (cols - 1)) * (width - padX * 2));
  type NodePos = { x: number; y: number; h: number; v: number; inOff: number; outOff: number };
  const pos = new Map<string, NodePos>();
  for (let c = 0; c < cols; c++) {
    let y = top;
    nodes
      .filter((n) => n.col === c)
      .forEach((n) => {
        const v = nodeVal(n.id);
        const h = v * k;
        pos.set(n.id, { x: xOf(c) - nw / 2, y, h, v, inOff: 0, outOff: 0 });
        y += h + gapY;
      });
  }

  const colorOf = new Map<string, string>(nodes.map((n) => [n.id, n.color] as [string, string]));
  const lastCol = cols - 1;

  const linkEls = links.map((l, i) => {
    const s = pos.get(l.from);
    const t = pos.get(l.to);
    if (!s || !t) return null;
    const h = l.value * k;
    const y0 = s.y + s.outOff + h / 2;
    s.outOff += h;
    const y1 = t.y + t.inOff + h / 2;
    t.inOff += h;
    const x0 = s.x + nw;
    const x1 = t.x;
    const xm = (x0 + x1) / 2;
    const active = hover === null || l.from === hover || l.to === hover;
    return (
      <path
        key={i}
        d={`M ${x0} ${y0} C ${xm} ${y0}, ${xm} ${y1}, ${x1} ${y1}`}
        fill="none"
        stroke={colorOf.get(l.from)}
        strokeWidth={Math.max(1, h)}
        strokeOpacity={active ? (hover ? 0.6 : 0.34) : 0.05}
        style={{ transition: "stroke-opacity .3s ease" }}
      />
    );
  });

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
        <defs>
          <clipPath id={`${uid}-c`}>
            <rect x={0} y={0} width={width * p} height={height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-c)`}>{linkEls}</g>
        {nodes.map((n) => {
          const s = pos.get(n.id);
          if (!s) return null;
          const cy = s.y + s.h / 2;
          const side = n.col === 0 ? "left" : n.col === lastCol ? "right" : "top";
          const tx = side === "left" ? s.x - 10 : side === "right" ? s.x + nw + 10 : s.x + nw / 2;
          const ty = side === "top" ? s.y - 20 : cy - 2;
          const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
          const connected =
            hover === null ||
            hover === n.id ||
            links.some((l) => (l.from === hover && l.to === n.id) || (l.to === hover && l.from === n.id));
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", opacity: connected ? 1 : 0.3, transition: "opacity .3s" }}
            >
              <rect x={s.x} y={s.y} width={nw} height={Math.max(2, s.h)} rx={3} fill={n.color} opacity={p} />
              <text x={tx} y={ty} textAnchor={anchor} fontSize="11" fill="#e8ecf5" className="bn">
                {n.label}
              </text>
              <text x={tx} y={ty + 14} textAnchor={anchor} fontSize="10" fill={n.color} className="mono">
                {fmt(s.v)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================== SUNBURST */

export type SunItem = {
  label: string;
  value: number;
  color: string;
  children: { label: string; value: number }[];
};

export function Sunburst({ data, size = 290 }: { data: SunItem[]; size?: number }) {
  const p = useProgress(1100, data.length);
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 6;
  const r1: [number, number] = [R * 0.3, R * 0.6];
  const r2: [number, number] = [R * 0.62, R * 0.98];

  const segs: {
    label: string;
    color: string;
    value: number;
    f0: number;
    f1: number;
    kids: { label: string; value: number; f0: number; f1: number }[];
  }[] = [];
  let cum = 0;
  for (const d of data) {
    const f0 = cum;
    const span = d.value / total;
    cum += span;
    let cf = f0;
    const kids = d.children.map((c) => {
      const k0 = cf;
      cf += span * (c.value / d.value);
      return { label: c.label, value: c.value, f0: k0, f1: cf };
    });
    segs.push({ label: d.label, color: d.color, value: d.value, f0, f1: cum, kids });
  }

  const A = (f: number) => -Math.PI / 2 + f * Math.PI * 2 * p;
  const safe = (a0: number, a1: number) => Math.max(a0 + 0.002, a1 - 0.004);
  const active = (label: string) => hover === null || hover === label;
  const cur = hover ? segs.find((s) => s.label === hover) : undefined;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        {segs.map((s) => (
          <path
            key={s.label}
            d={arcPath(cx, cy, r1[0], r1[1], A(s.f0), safe(A(s.f0), A(s.f1)))}
            fill={s.color}
            fillOpacity={active(s.label) ? 0.9 : 0.2}
            stroke="#0a0c12"
            strokeWidth="1.5"
            onMouseEnter={() => setHover(s.label)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer", transition: "fill-opacity .3s ease" }}
          />
        ))}
        {segs.flatMap((s) =>
          s.kids.map((k) => (
            <path
              key={s.label + k.label}
              d={arcPath(cx, cy, r2[0], r2[1], A(k.f0), safe(A(k.f0), A(k.f1)))}
              fill={s.color}
              fillOpacity={active(s.label) ? 0.5 : 0.1}
              stroke="#0a0c12"
              strokeWidth="1"
              onMouseEnter={() => setHover(s.label)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", transition: "fill-opacity .3s ease" }}
            />
          )),
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="mono text-xl font-bold tabular text-white">{fmt(cur ? cur.value : total)}</div>
        <div className="bn mt-0.5 max-w-[60%] text-[10px] uppercase tracking-wider text-white/45">
          {cur ? cur.label : "মোট প্রতিবেদন"}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ ROSE (polar) */

export function RoseChart({
  data,
  size = 280,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const p = useProgress(1000, data.length);
  const [hover, setHover] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r0 = size * 0.2;
  const rMax = size / 2 - 22;
  const max = Math.max(...data.map((d) => d.value));
  const n = data.length;
  const step = (Math.PI * 2) / n;
  const gap = 0.025;
  const hv = hover !== null ? data[hover] : null;
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        {[0.35, 0.7, 1].map((t, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r0 + Math.sqrt(t) * (rMax - r0)}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray="3 5"
          />
        ))}
        {data.map((d, i) => {
          const a0 = -Math.PI / 2 + i * step + gap;
          const a1 = a0 + step - gap * 2;
          const r = r0 + Math.sqrt(d.value / max) * (rMax - r0) * p;
          return (
            <path
              key={i}
              d={arcPath(cx, cy, r0, Math.max(r0 + 1, r), a0, a1)}
              fill={d.color}
              fillOpacity={hover === null || hover === i ? 0.85 : 0.22}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{
                cursor: "pointer",
                transition: "fill-opacity .25s ease",
                filter: hover === i ? `drop-shadow(0 0 8px ${d.color})` : undefined,
              }}
            />
          );
        })}
        {data.map((d, i) => {
          if (i % 6 !== 0) return null;
          const [lx, ly] = polar(cx, cy, rMax + 14, -Math.PI / 2 + (i + 0.5) * step);
          return (
            <text key={d.label} x={lx} y={ly + 3} textAnchor="middle" fontSize="9" fill="#5d6679" className="mono">
              {d.label}
            </text>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="mono text-xl font-bold tabular text-white">{fmt(hv ? hv.value : total)}</div>
        <div className="mono mt-0.5 text-[10px] text-white/45">{hv ? hv.label : "24H TOTAL"}</div>
      </div>
    </div>
  );
}

/* ============================================================== RADIAL BARS */

export function RadialBars({
  data,
  size = 280,
}: {
  data: { label: string; value: number; max: number; color: string }[];
  size?: number;
}) {
  const p = useProgress(1200, data.length);
  const cx = size / 2;
  const cy = size / 2;
  const th = 12;
  const gap = 9;
  const outer = size / 2 - 12;
  const span = Math.PI * 1.5;
  const start = -Math.PI / 2;
  const avg = data.reduce((a, d) => a + (d.value / d.max) * 100, 0) / data.length;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="mx-auto overflow-visible">
      {data.map((d, i) => {
        const r = outer - i * (th + gap);
        const frac = Math.min(1, d.value / d.max) * p;
        return (
          <g key={d.label}>
            <path d={arcPath(cx, cy, r - th / 2, r + th / 2, start, start + span - 0.002)} fill="rgba(255,255,255,0.06)" />
            <path
              d={arcPath(cx, cy, r - th / 2, r + th / 2, start, start + Math.max(0.002, span * frac))}
              fill={d.color}
              style={{ filter: `drop-shadow(0 0 6px ${d.color}88)` }}
            />
            <text x={cx - 8} y={cy - r + 4} textAnchor="end" fontSize="9.5" fill="rgba(255,255,255,0.72)" className="bn">
              {d.label} · {d.value}%
            </text>
          </g>
        );
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff" className="mono">
        {Math.round(avg * p)}%
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.4)" className="mono">
        AVG HEALTH
      </text>
    </svg>
  );
}

/* ================================================================ BOX PLOT */

export type BoxStat = {
  label: string;
  min: number;
  q1: number;
  med: number;
  q3: number;
  max: number;
  color: string;
  outliers?: number[];
};

export function BoxPlot({ data, height = 270, unit = "s" }: { data: BoxStat[]; height?: number; unit?: string }) {
  const p = useProgress(1100, data.length);
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 270;
  const L = 40;
  const R = 12;
  const T = 16;
  const B = 34;
  const iw = W - L - R;
  const ih = H - T - B;
  const base = T + ih;
  const maxV = Math.max(...data.map((d) => Math.max(d.max, ...(d.outliers ?? [])))) * 1.1;
  const Yg = (v: number) => base - (v / maxV) * ih;
  const Y = (v: number) => base - (v / maxV) * ih * p;
  const band = iw / data.length;
  const bw = Math.min(44, band * 0.42);
  const hd = hover !== null ? data[hover] : null;

  return (
    <div className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={Yg(maxV * t)} y2={Yg(maxV * t)} stroke="rgba(255,255,255,0.06)" strokeDasharray={i ? "3 6" : ""} />
            <text x={L - 8} y={Yg(maxV * t) + 4} textAnchor="end" fontSize="9.5" fill="#5d6679" className="mono">
              {(maxV * t).toFixed(1)}
              {unit}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + band * (i + 0.5);
          const isH = hover === i;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
              <rect x={cx - band / 2} y={T} width={band} height={ih} fill={isH ? "rgba(255,255,255,0.04)" : "transparent"} />
              <line x1={cx} x2={cx} y1={Y(d.max)} y2={Y(d.min)} stroke={d.color} strokeWidth="1.5" opacity={0.85} />
              <line x1={cx - bw / 4} x2={cx + bw / 4} y1={Y(d.max)} y2={Y(d.max)} stroke={d.color} strokeWidth="1.5" />
              <line x1={cx - bw / 4} x2={cx + bw / 4} y1={Y(d.min)} y2={Y(d.min)} stroke={d.color} strokeWidth="1.5" />
              <rect
                x={cx - bw / 2}
                y={Y(d.q3)}
                width={bw}
                height={Math.max(1, Y(d.q1) - Y(d.q3))}
                rx={4}
                fill={d.color}
                fillOpacity={isH ? 0.5 : 0.25}
                stroke={d.color}
                strokeWidth="1.5"
              />
              <line x1={cx - bw / 2} x2={cx + bw / 2} y1={Y(d.med)} y2={Y(d.med)} stroke="#fff" strokeWidth="2" />
              {(d.outliers ?? []).map((o, j) => (
                <circle key={j} cx={cx + ((j % 3) - 1) * 6} cy={Y(o)} r="3" fill={d.color} opacity={p} />
              ))}
              <text x={cx} y={H - 12} textAnchor="middle" fontSize="10" fill="#8a93a8" className="bn">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hd && hover !== null && (
        <Tooltip x={(L + band * (hover + 0.5)) / W}>
          <div className="bn font-semibold text-white">{hd.label}</div>
          <div className="mono text-white/55">
            min {hd.min} · med {hd.med} · max {hd.max}
            {unit}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* ============================================================ BULLET GROUP */

export type BulletItem = {
  label: string;
  value: number;
  target: number;
  max: number;
  color: string;
  unit?: string;
  dec?: number;
  lowerIsBetter?: boolean;
};

export function BulletGroup({ items }: { items: BulletItem[] }) {
  const p = useProgress(1000, items.length);
  return (
    <div className="space-y-4">
      {items.map((it) => {
        const met = it.lowerIsBetter ? it.value <= it.target : it.value >= it.target;
        const pct = (v: number) => (v / it.max) * 100;
        const dec = it.dec ?? 0;
        return (
          <div key={it.label}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11.5px]">
              <span className="bn text-white/75">{it.label}</span>
              <span className="flex items-center gap-2">
                <span className="mono font-semibold tabular" style={{ color: it.color }}>
                  {fmt(it.value, dec)}
                  {it.unit ?? ""}
                </span>
                <span className="mono text-white/30">/ {fmt(it.target, dec)}</span>
                <span
                  className={cn(
                    "mono rounded px-1.5 py-[1px] text-[9px]",
                    met ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300",
                  )}
                >
                  {met ? "MET" : "MISS"}
                </span>
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-sm bg-white/[0.04]">
              <div className="absolute inset-y-0 left-0 bg-white/[0.035]" style={{ width: `${pct(it.target * 0.7)}%` }} />
              <div
                className="absolute inset-y-0 bg-white/[0.06]"
                style={{ left: `${pct(it.target * 0.7)}%`, width: `${pct(it.target * 0.3)}%` }}
              />
              <div className="absolute inset-y-0 bg-white/[0.09]" style={{ left: `${pct(it.target)}%`, right: 0 }} />
              <div
                className="absolute inset-y-[3px] left-0 rounded-sm"
                style={{
                  width: `${Math.min(100, pct(it.value)) * p}%`,
                  background: `linear-gradient(90deg, ${it.color}55, ${it.color})`,
                  boxShadow: `0 0 12px ${it.color}66`,
                }}
              />
              <div className="absolute -inset-y-0.5 w-[2px] bg-white" style={{ left: `${pct(it.target)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================ COMBO CHART */

export function ComboChart({
  labels,
  bars,
  line,
  height = 290,
}: {
  labels: string[];
  bars: Series;
  line: Series;
  height?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const p = useProgress(1100, labels.length);
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = 290;
  const L = 46;
  const R = 50;
  const T = 18;
  const B = 30;
  const iw = W - L - R;
  const ih = H - T - B;
  const n = labels.length;
  const barMax = Math.max(...bars.values) * 1.2;
  const lMin = Math.floor(Math.min(...line.values)) - 2;
  const lMax = Math.ceil(Math.max(...line.values)) + 1;
  const band = iw / n;
  const bw = band * 0.52;
  const X = (i: number) => L + band * (i + 0.5);
  const YB = (v: number) => T + ih - (v / barMax) * ih * p;
  const YL = (v: number) => T + ih - ((v - lMin) / (lMax - lMin)) * ih;
  const pts = line.values.map((v, i) => [X(i), YL(v)] as [number, number]);
  const d = smoothPath(pts);

  return (
    <div className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bars.color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={bars.color} stopOpacity="0.2" />
          </linearGradient>
          <clipPath id={`${uid}-lc`}>
            <rect x={0} y={0} width={L + iw * p + 10} height={H} />
          </clipPath>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = T + ih - t * ih;
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray={i ? "3 6" : ""} />
              <text x={L - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#5d6679" className="mono">
                {Math.round((barMax * t) / 1.2)}
              </text>
              <text x={W - R + 8} y={y + 4} textAnchor="start" fontSize="10" fill={line.color} className="mono" opacity="0.75">
                {Math.round(lMin + (lMax - lMin) * t)}%
              </text>
            </g>
          );
        })}
        {bars.values.map((v, i) => {
          const y = YB(v);
          const isH = hover === i;
          return (
            <rect
              key={i}
              x={X(i) - bw / 2}
              y={y}
              width={bw}
              height={Math.max(0, T + ih - y)}
              rx={5}
              fill={`url(#${uid}-bar)`}
              opacity={hover === null || isH ? 1 : 0.45}
              style={{ transition: "opacity .25s" }}
            />
          );
        })}
        <g clipPath={`url(#${uid}-lc)`}>
          <path d={d} fill="none" stroke={line.color} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 6px ${line.color})` }} />
        </g>
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={hover === i ? 5.5 : 3.2}
            fill="#0a0c12"
            stroke={line.color}
            strokeWidth="2"
            opacity={p}
          />
        ))}
        {labels.map((lb, i) => (
          <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#5d6679" className="bn">
            {lb}
          </text>
        ))}
        {labels.map((_, i) => (
          <rect key={`h${i}`} x={L + band * i} y={T} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <Tooltip x={X(hover) / W}>
          <div className="bn mb-1 font-semibold text-white/90">{labels[hover]}</div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: bars.color }} />
            <span className="bn text-white/55">{bars.name}</span>
            <span className="mono ml-auto pl-3 font-semibold text-white">{fmt(bars.values[hover])}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: line.color }} />
            <span className="bn text-white/55">{line.name}</span>
            <span className="mono ml-auto pl-3 font-semibold text-white">{line.values[hover]}%</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* ========================================================= LIVE STREAM */

export function LiveStream({
  color = palette.amber,
  label = "রেকর্ড / মিনিট",
  points = 60,
}: {
  color?: string;
  label?: string;
  points?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: points }, (_, i) => 55 + Math.sin(i / 5) * 18 + (Math.random() - 0.5) * 8),
  );
  const [live, setLive] = useState(true);

  useInterval(
    () => {
      setData((d) => {
        const last = d[d.length - 1];
        const next = Math.min(96, Math.max(8, last + (Math.random() - 0.48) * 14));
        return [...d.slice(1), next];
      });
    },
    live ? 1000 : null,
  );

  const W = 600;
  const H = 200;
  const pad = 10;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - pad - (v / 100) * (H - pad * 2)] as [number, number]);
  const d = smoothPath(pts);
  const tip = pts[pts.length - 1];
  const cur = data[data.length - 1];
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const peak = Math.max(...data);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className="mono text-3xl font-bold tabular text-white">{fmt(Math.round(cur * 3.4))}</div>
          <div className="bn text-[10px] text-white/40">{label}</div>
        </div>
        <div>
          <div className="mono text-sm font-semibold tabular text-white/75">{fmt(Math.round(avg * 3.4))}</div>
          <div className="mono text-[9px] tracking-widest text-white/30">AVG</div>
        </div>
        <div>
          <div className="mono text-sm font-semibold tabular text-white/75">{fmt(Math.round(peak * 3.4))}</div>
          <div className="mono text-[9px] tracking-widest text-white/30">PEAK</div>
        </div>
        <button
          onClick={() => setLive((l) => !l)}
          className="mono ml-auto rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/55 transition hover:border-amber-brand/40 hover:text-amber-brand"
        >
          {live ? "❚❚ PAUSE" : "▶ LIVE"}
        </button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={0} x2={W} y1={H * t} y2={H * t} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 6" />
        ))}
        <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${uid}-a)`} />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <circle cx={tip[0]} cy={tip[1]} r="12" fill={color} opacity="0.2" className="blink" />
        <circle cx={tip[0]} cy={tip[1]} r="4" fill={color} />
      </svg>
      <div className="mono mt-1 flex justify-between text-[9px] text-white/25">
        <span>-60s</span>
        <span>-30s</span>
        <span>now</span>
      </div>
    </div>
  );
}

/* ============================================================ WORD CLOUD */

export function WordCloud({ words }: { words: { text: string; w: number; color: string }[] }) {
  return (
    <div className="flex min-h-[230px] flex-wrap content-center items-center justify-center gap-x-4 gap-y-3 px-2">
      {words.map((w, i) => (
        <span key={w.text} className="anim-pop inline-block" style={{ animationDelay: `${i * 45}ms` }}>
          <span
            className="bn inline-block cursor-default whitespace-nowrap font-semibold"
            style={{
              fontSize: `${12 + w.w * 0.22}px`,
              color: w.color,
              opacity: 0.5 + w.w / 200,
              textShadow: `0 0 18px ${w.color}66`,
              animation: `bob ${3 + (i % 4)}s ease-in-out ${i * 0.25}s infinite alternate`,
            }}
          >
            {w.text}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ========================================================= STACKED 100% */

export function Stacked100({
  rows,
}: {
  rows: { label: string; parts: { name: string; value: number; color: string }[] }[];
}) {
  const p = useProgress(1000, rows.length);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const tot = r.parts.reduce((a, b) => a + b.value, 0);
        return (
          <div key={r.label}>
            <div className="mb-1 bn text-[11px] text-white/70">{r.label}</div>
            <div className="flex h-5 overflow-hidden rounded-md bg-white/[0.03]">
              {r.parts.map((pt) => (
                <div
                  key={pt.name}
                  className="relative h-full hover:brightness-125"
                  title={`${pt.name} ${pt.value}%`}
                  style={{
                    width: `${(pt.value / tot) * 100 * p}%`,
                    background: `linear-gradient(180deg, ${pt.color}, ${pt.color}aa)`,
                  }}
                >
                  {pt.value >= 10 && p > 0.9 && (
                    <span className="mono absolute inset-0 grid place-items-center text-[9.5px] font-bold text-ink-950/80">
                      {pt.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

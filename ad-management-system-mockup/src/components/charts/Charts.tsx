/* Pure-SVG chart kit — no runtime dependency, animates via CSS. */

export type Pt = { x: string; y: number };

/* ---------------------------------------------------------------- */
export function AreaChart({
  series,
  height = 180,
  colors = ["#5f8f0e", "#d2202c"],
  labels = [],
}: {
  series: { name: string; points: Pt[] }[];
  height?: number;
  colors?: string[];
  labels?: string[];
}) {
  const W = 760;
  const H = height;
  const pad = { t: 12, r: 10, b: 22, l: 34 };
  const n = series[0]?.points.length ?? 0;
  if (!n) return null;

  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const stepX = (W - pad.l - pad.r) / Math.max(1, n - 1);
  const sy = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const sx = (i: number) => pad.l + i * stepX;

  const ticks = 4;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img">
        <g className="chart-grid">
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const y = pad.t + (i * (H - pad.t - pad.b)) / ticks;
            return <line key={i} x1={pad.l} x2={W - pad.r} y1={y} y2={y} />;
          })}
        </g>
        <g className="chart-axis">
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const v = Math.round(max - (i * max) / ticks);
            const y = pad.t + (i * (H - pad.t - pad.b)) / ticks;
            return <text key={i} x={pad.l - 6} y={y + 3} textAnchor="end">{v.toLocaleString()}</text>;
          })}
          {series[0].points.map((p, i) =>
            i % Math.ceil(n / 8) === 0 ? (
              <text key={i} x={sx(i)} y={H - 6} textAnchor="middle">{p.x}</text>
            ) : null
          )}
        </g>

        {series.map((s, si) => {
          const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(p.y)}`).join(" ");
          const area = `${d} L${sx(n - 1)},${H - pad.b} L${sx(0)},${H - pad.b} Z`;
          return (
            <g key={s.name}>
              <defs>
                <linearGradient id={`g${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[si % colors.length]} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={colors[si % colors.length]} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="chart-area" d={area} fill={`url(#g${si})`} />
              <path className="chart-line" d={d} fill="none" stroke={colors[si % colors.length]} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" style={{ animationDelay: `${si * 180}ms` }} />
              {s.points.map((p, i) => (
                <circle key={i} cx={sx(i)} cy={sy(p.y)} r="2.6" fill={colors[si % colors.length]}>
                  <title>{`${p.x} · ${s.name}: ${p.y.toLocaleString()}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 font-mono-x text-[10px] tracking-[0.14em] text-ink-soft uppercase">
        {(labels.length ? labels : series.map((s) => s.name)).map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            <i className="inline-block h-2 w-2" style={{ background: colors[i % colors.length] }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
export function BarChart({
  data,
  height = 180,
  color = "#1a140d",
  accent = "#d2202c",
  money = false,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  accent?: string;
  money?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = data.reduce((m, d) => (d.value > m.value ? d : m), data[0]);

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.value.toLocaleString()}`}>
            <span className="mb-1 text-center font-mono-x text-[9px] text-ink-soft opacity-0 transition-opacity group-hover:opacity-100">
              {money ? "৳" : ""}{d.value.toLocaleString()}
            </span>
            <div
              className="chart-bar w-full transition-colors"
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                background: d.label === top.label ? accent : color,
                opacity: d.label === top.label ? 1 : 0.72,
                animationDelay: `${i * 45}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center font-mono-x text-[8.5px] text-ink-soft uppercase">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
export function DonutChart({
  data,
  size = 170,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const R = (size - thickness) / 2;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgba(26,20,13,.1)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * C;
            const el = (
              <circle
                key={d.label}
                className="ring-seg"
                cx={size / 2}
                cy={size / 2}
                r={R}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-acc * C}
                style={{ ["--circ" as string]: `${C}`, animationDelay: `${i * 120}ms` }}
              >
                <title>{`${d.label}: ${d.value.toLocaleString()} (${Math.round(frac * 100)}%)`}</title>
              </circle>
            );
            acc += frac;
            return el;
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="font-serif-bn" style={{ fontSize: 24, fontWeight: 900, fill: "var(--color-ink)" }}>
          {centerValue}
        </text>
        <text x="50%" y="61%" textAnchor="middle" style={{ fontSize: 9, letterSpacing: 2, fill: "var(--color-ink-soft)", textTransform: "uppercase" }}>
          {centerLabel}
        </text>
      </svg>

      <ul className="min-w-[150px] flex-1 space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 border-b border-ink/10 pb-1.5 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0" style={{ background: d.color }} />
            <span className="flex-1 truncate text-ink">{d.label}</span>
            <b className="font-mono-x text-ink">{d.value.toLocaleString()}</b>
            <span className="font-mono-x text-[10px] text-ink-soft">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- */
export function Sparkline({
  points,
  color = "#5f8f0e",
  w = 112,
  h = 30,
}: {
  points: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  if (!points.length) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(1, max - min);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * w},${h - ((p - min) / span) * (h - 4) - 2}`)
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={up ? color : "#d2202c"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
export function Heatmap({
  rows,
  cols,
  values,
  color = "#5f8f0e",
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  color?: string;
}) {
  const max = Math.max(1, ...values.flat());
  return (
    <div className="scroll-x">
      <table style={{ borderSpacing: 3, borderCollapse: "separate" }}>
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="px-0.5 font-mono-x text-[8px] font-normal text-ink-soft uppercase">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r}>
              <td className="pr-2 text-right font-mono-x text-[9px] whitespace-nowrap text-ink-soft uppercase">{r}</td>
              {cols.map((c, ci) => {
                const v = values[ri]?.[ci] ?? 0;
                const a = v / max;
                return (
                  <td key={c}>
                    <div
                      className="heat-cell h-5 w-5 cursor-default"
                      title={`${r} · ${c}: ${v.toLocaleString()}`}
                      style={{ background: a === 0 ? "rgba(26,20,13,.06)" : color, opacity: a === 0 ? 1 : 0.18 + a * 0.82 }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2 font-mono-x text-[9px] text-ink-soft uppercase">
        কম
        {[0.15, 0.35, 0.55, 0.78, 1].map((a) => (
          <span key={a} className="h-3 w-5" style={{ background: color, opacity: a }} />
        ))}
        বেশি
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
export function Funnel({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const prev = i > 0 ? steps[i - 1].value : s.value;
        const drop = prev ? ((s.value / prev) * 100).toFixed(1) : "100";
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-ink">{s.label}</span>
              <span className="flex items-center gap-2">
                <b className="font-mono-x text-ink">{s.value.toLocaleString()}</b>
                <span className="font-mono-x text-[10px] text-ink-soft">{drop}%</span>
              </span>
            </div>
            <div className="mt-1 h-5 w-full bg-ink/[0.06]">
              <div
                className="chart-bar h-full transition-[width] duration-700"
                style={{ width: `${pct}%`, background: s.color, transformOrigin: "left", animationDelay: `${i * 90}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
export function RadialGauge({
  value,
  max = 100,
  label,
  color = "#5f8f0e",
  size = 120,
}: {
  value: number;
  max?: number;
  label: string;
  color?: string;
  size?: number;
}) {
  const R = size / 2 - 10;
  const C = Math.PI * R; // half circle
  const frac = Math.min(1, value / max);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 14} viewBox={`0 0 ${size} ${size / 2 + 14}`}>
        <path d={`M10,${size / 2} A${R},${R} 0 0 1 ${size - 10},${size / 2}`} fill="none" stroke="rgba(26,20,13,.1)" strokeWidth="9" strokeLinecap="round" />
        <path
          className="ring-seg"
          d={`M10,${size / 2} A${R},${R} 0 0 1 ${size - 10},${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${frac * C} ${C}`}
          style={{ ["--circ" as string]: `${C}` }}
        />
        <text x="50%" y={size / 2 - 6} textAnchor="middle" className="font-serif-bn" style={{ fontSize: 20, fontWeight: 900, fill: "var(--color-ink)" }}>
          {Math.round(frac * 100)}%
        </text>
      </svg>
      <p className="font-mono-x text-[9px] tracking-[0.16em] text-ink-soft uppercase">{label}</p>
    </div>
  );
}

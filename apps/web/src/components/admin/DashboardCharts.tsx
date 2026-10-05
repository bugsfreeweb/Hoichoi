import type { RadarSnapshot, RunDayPoint } from "@hoichoi/db";

/**
 * Server-rendered SVG charts for the admin dashboard.
 *
 * These were hand-drawn rather than pulled from a chart library on purpose:
 * the dashboard needs exactly two graphics, and a plotting dependency would add
 * far more client weight than the two views are worth. Everything here renders
 * on the server, so the console ships no extra JavaScript for them.
 *
 * Colours come from `--chart-*` tokens in globals.css rather than hex literals.
 * The light-theme flip for text works by overriding Tailwind classes under
 * `.admin-console`, which cannot reach an SVG `fill`, so a literal hex here
 * would stay dark-on-light and quietly become unreadable in one theme.
 */

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

/** Rounds a peak up to a readable axis maximum (1/2/5 x 10^n). */
function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}/${Number(d)}`;
}

const SERIES = [
  { key: "collected" as const, label: "সংগৃহীত", color: "var(--chart-collected)" },
  { key: "published" as const, label: "প্রকাশিত", color: "var(--chart-published)" },
  { key: "duplicates" as const, label: "ডুপ্লিকেট ব্লকড", color: "var(--chart-duplicates)" },
];

export function RunTrendChart({ series }: { series: RunDayPoint[] }) {
  const W = 760;
  const H = 224;
  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

  const peak = niceMax(
    series.reduce((m, d) => Math.max(m, d.collected, d.published, d.duplicates), 0),
  );

  const x = (i: number): number =>
    series.length <= 1 ? padL + plotW / 2 : padL + (i * plotW) / (series.length - 1);
  const y = (v: number): number => baseY - (v / peak) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(peak * f));

  const hasData = series.some((d) => d.collected > 0 || d.published > 0 || d.duplicates > 0);

  return (
    <section className="rounded-2xl border border-white/10 bg-panel p-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-serif-bn text-[17px] font-bold text-white">পাইপলাইন থ্রেন্ড</h2>
        <p className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/45 uppercase">
          LAST {toBn(series.length)} DAYS · DAILY
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-white/60">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="py-16 text-center text-[12.5px] text-white/45">
          এই সময়সীমায় কোনো পাইপলাইন রান নেই।
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-5 w-full"
          role="img"
          aria-label="দৈনিক সংগৃহীত, প্রকাশিত ও ব্লকড ডুপ্লিকেটের লাইন চার্ট"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y(t) + 3.5}
                textAnchor="end"
                className="font-mono-x"
                fontSize={9}
                fill="var(--chart-axis)"
              >
                {toBn(t)}
              </text>
            </g>
          ))}

          {SERIES.map((s) => {
            const path = series
              .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d[s.key]).toFixed(1)}`)
              .join(" ");
            const area = `${path} L${x(series.length - 1).toFixed(1)} ${baseY} L${x(0).toFixed(1)} ${baseY} Z`;
            return (
              <g key={s.key}>
                <path d={area} fill={s.color} opacity={0.1} />
                <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
              </g>
            );
          })}

          {/* Native tooltips: hovering a marker names the day and all three counts
              without shipping a chart-interaction runtime. */}
          {series.map((d, i) => (
            <g key={d.day}>
              <title>
                {`${shortDay(d.day)} — সংগৃহীত ${toBn(d.collected)}, প্রকাশিত ${toBn(d.published)}, ডুপ্লিকেট ${toBn(d.duplicates)}`}
              </title>
              {SERIES.map((s) => (
                <circle key={s.key} cx={x(i)} cy={y(d[s.key])} r={2.6} fill={s.color} />
              ))}
            </g>
          ))}

          {series.map((d, i) =>
            i % 2 === 0 || i === series.length - 1 ? (
              <text
                key={d.day}
                x={x(i)}
                y={H - 10}
                textAnchor="middle"
                className="font-mono-x"
                fontSize={9}
                fill="var(--chart-axis)"
              >
                {toBn(shortDay(d.day))}
              </text>
            ) : null,
          )}
        </svg>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-4 sm:grid-cols-4">
        {(
          [
            ["রান", series.reduce((n, d) => n + d.runs, 0)],
            ["সংগৃহীত", series.reduce((n, d) => n + d.collected, 0)],
            ["প্রকাশিত", series.reduce((n, d) => n + d.published, 0)],
            ["ব্যর্থ রান", series.reduce((n, d) => n + d.failed, 0)],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] text-white/45">{label}</p>
            <p className="mt-0.5 font-serif-bn text-[20px] leading-none font-black text-white">
              {toBn(value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoryFunnel({ radar }: { radar: RadarSnapshot }) {
  const rows = radar.categories.map((c) => {
    const collected = radar.stages.collected[c.slug] ?? 0;
    const queued = radar.stages.queued[c.slug] ?? 0;
    const published = radar.stages.published[c.slug] ?? 0;
    const duplicate = radar.stages.duplicate[c.slug] ?? 0;
    return {
      ...c,
      collected,
      queued,
      published,
      duplicate,
      publishRate: collected > 0 ? Math.round((published / collected) * 100) : 0,
    };
  });
  const peak = Math.max(1, ...rows.map((r) => r.collected));
  const totalCollected = rows.reduce((n, r) => n + r.collected, 0);

  return (
    <section className="rounded-2xl border border-white/10 bg-panel p-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-serif-bn text-[17px] font-bold text-white">ক্যাটাগরি ফানেল</h2>
        <p className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/45 uppercase">
          COLLECTED → PUBLISHED
        </p>
        <p className="ml-auto text-[11.5px] text-white/60">
          মোট সংগৃহীত <span className="font-mono-x font-bold text-white">{toBn(totalCollected)}</span>
        </p>
      </div>

      {totalCollected === 0 ? (
        <p className="py-12 text-center text-[12.5px] text-white/45">এখনো কোনো রকল পোস্ট সংগৃহীত হয়নি।</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {rows.map((r) => (
            <li key={r.slug}>
              <div className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="flex items-center gap-2 font-semibold text-white/85">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: r.dot || "var(--chart-collected)" }}
                  />
                  {r.name}
                </span>
                <span className="font-mono-x text-[10.5px] text-white/50">
                  {toBn(r.collected)} সংগৃহীত · {toBn(r.published)} প্রকাশিত ·{" "}
                  <span className={r.publishRate >= 50 ? "text-lime" : "text-amberx"}>
                    {toBn(r.publishRate)}%
                  </span>
                </span>
              </div>
              {/* Segments share the row proportional to the category's own
                  collected total, so rows stay comparable across categories. */}
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-white/8">
                {(
                  [
                    ["published", r.published, "var(--chart-published)"],
                    ["queued", r.queued, "var(--chart-collected)"],
                    ["duplicate", r.duplicate, "var(--chart-duplicates)"],
                  ] as const
                ).map(([key, value, color]) =>
                  value > 0 ? (
                    <span
                      key={key}
                      title={`${key}: ${toBn(value)}`}
                      style={{ width: `${(value / peak) * 100}%`, background: color }}
                    />
                  ) : null,
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-4 border-t border-white/8 pt-4">
        {(
          [
            ["প্রকাশিত", "var(--chart-published)"],
            ["সারিতে", "var(--chart-collected)"],
            ["ডুপ্লিকেট", "var(--chart-duplicates)"],
          ] as const
        ).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-white/60">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="ml-auto text-[10.5px] text-white/40">
          বারটি প্রতিটি ক্যাটাগরির নিজস্ব সংগৃহীতের সাপেক্ষে আঁকা
        </span>
      </div>
    </section>
  );
}

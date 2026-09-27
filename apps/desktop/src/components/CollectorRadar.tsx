"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Lock, Radar, Radio, Unlock } from "lucide-react";
import type { DeskQueueRow, DeskRadarSnapshot } from "../lib/tauri";
import { bnTime, toBn } from "../lib/format";

/**
 * Collector polar radar — the mockup `NewsRadar` chart, driven by REAL desk
 * rows. One wedge per active category; each wedge stacks the pipeline stages
 * (published → queued → collected → duplicate) radially, mirroring the
 * mockup's engagement-tier stacks. Theme-aware via the desk CSS variables so
 * it flips with `html[data-theme]`.
 */

type Metric = "count" | "percentage";
type StageId = "published" | "queued" | "collected" | "duplicate";

const STAGES: Array<{ index: number; id: StageId; label: string; short: string; color: string }> = [
  { index: 0, id: "published", label: "প্রকাশিত", short: "Pub", color: "var(--ds-acc)" },
  { index: 1, id: "queued", label: "কিউ অপেক্ষমাণ", short: "Que", color: "var(--ds-amber)" },
  { index: 2, id: "collected", label: "সংগৃহীত", short: "Col", color: "var(--ds-sky)" },
  { index: 3, id: "duplicate", label: "ডুপ্লিকেট", short: "Dup", color: "var(--ds-rose)" },
];

const VIEW = 720;
const CX = VIEW / 2;
const CY = VIEW / 2;
const MAX_R = 236;
const HUB = 16;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeAnnularWedge(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
): string {
  if (rOuter <= rInner + 0.05) return "";
  const os = polarToCartesian(cx, cy, rOuter, startDeg);
  const oe = polarToCartesian(cx, cy, rOuter, endDeg);
  let diff = endDeg - startDeg;
  if (diff < 0) diff += 360;
  const large = diff > 180 ? 1 : 0;
  const is = polarToCartesian(cx, cy, rInner, startDeg);
  const ie = polarToCartesian(cx, cy, rInner, endDeg);
  return `M ${os.x.toFixed(2)} ${os.y.toFixed(2)} A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 ${large} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)} L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)} A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 ${large} 0 ${is.x.toFixed(2)} ${is.y.toFixed(2)} Z`;
}

function bnNum(n: number): string {
  return toBn(n.toLocaleString("en-US"));
}
function bnPct(n: number): string {
  return `${toBn(n.toFixed(1))}%`;
}

interface Props {
  data?: DeskRadarSnapshot | null;
  latestQueue?: DeskQueueRow[];
  running: boolean;
}

export default function CollectorRadar({ data, latestQueue, running }: Props) {
  const [sweep, setSweep] = useState(0);
  const [sweepEnabled, setSweepEnabled] = useState(true);
  const [metric, setMetric] = useState<Metric>("count");
  const [visible, setVisible] = useState<boolean[]>([true, true, true, true]);
  const [lockedSector, setLockedSector] = useState<number | null>(null);
  const [hoveredSector, setHoveredSector] = useState<number | null>(null);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [hoverSeg, setHoverSeg] = useState<{ s: number; t: number } | null>(null);

  useEffect(() => {
    if (!sweepEnabled) return;
    let id: number;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setSweep((p) => (p + (dt / 1000) * (running ? 45 : 15)) % 360);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [sweepEnabled, running]);

  const cats = useMemo(() => data?.categories ?? [], [data]);
  const N = cats.length;
  const SPAN = N > 0 ? 360 / N : 0;

  const stageOf = useMemo(() => {
    const out = new Map<StageId, (slug: string) => number>();
    for (const st of STAGES) {
      out.set(st.id, (slug: string) => data?.stages?.[st.id]?.[slug] ?? 0);
    }
    return out;
  }, [data]);

  const sectorTotals = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < N; i++) {
      let t = 0;
      for (const st of STAGES) t += stageOf.get(st.id)!(cats[i].slug);
      out.push(t);
    }
    return out;
  }, [cats, N, stageOf]);

  const grand = useMemo(() => {
    let t = 0;
    for (const s of sectorTotals) t += s;
    return Math.max(1, t);
  }, [sectorTotals]);

  const { radialMax, rings } = useMemo(() => {
    if (metric === "percentage") {
      const maxPct = Math.max(4, (Math.max(...sectorTotals) / grand) * 100);
      const ceil = Math.ceil((maxPct + 1) / 4) * 4;
      const step = ceil / 4;
      return { radialMax: ceil, rings: [1, 2, 3, 4].map((i) => +(i * step).toFixed(1)) };
    }
    const step = Math.max(5, Math.ceil(Math.max(20, ...sectorTotals) / 4 / 5) * 5);
    return { radialMax: step * 4, rings: [step, step * 2, step * 3, step * 4] };
  }, [metric, sectorTotals, grand]);

  const vToR = (v: number) =>
    v <= 0 ? HUB : HUB + (Math.min(radialMax, v) / radialMax) * (MAX_R - HUB);

  const wedges = useMemo(() => {
    const half = SPAN / 2 - 1.4;
    return cats.map((cat, i) => {
      let cum = 0;
      const segs = STAGES.map((st) => {
        const raw = stageOf.get(st.id)!(cat.slug);
        const val = !visible[st.index]
          ? 0
          : metric === "percentage"
            ? (raw / grand) * 100
            : raw;
        const start = cum;
        cum += val;
        return {
          t: st.index,
          color: st.color,
          d:
            val > 0.0001
              ? describeAnnularWedge(CX, CY, vToR(start), vToR(cum), i * SPAN - half, i * SPAN + half)
              : "",
        };
      });
      return { cat, i, segs };
    });
  }, [cats, stageOf, visible, metric, grand, radialMax, SPAN]);

  const active = hoveredSector ?? lockedSector;
  const activeIndex = active !== null && active < N ? active : null;
  const activeCat = activeIndex !== null ? cats[activeIndex] : null;
  const hiddenCount = visible.filter((v) => !v).length;
  const latest = latestQueue?.[0];

  const labelR = N <= 6 ? MAX_R + 62 : N <= 8 ? MAX_R + 56 : MAX_R + 48;
  const bandIn = N <= 8 ? MAX_R + 20 : MAX_R + 16;
  const labelSize = N <= 6 ? 15 : N <= 8 ? 12.5 : 10.5;

  if (N === 0 || !data) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--color-bd)] bg-[var(--color-panel-bg)]">
        <div className="relative z-10 flex items-center gap-2 border-b border-[var(--color-bd)] px-4 py-2.5">
          <Radar size={15} className="text-[var(--ds-sky)]" />
          <span className="font-serif-bn text-sm font-bold text-[var(--ds-t1)]">সংগ্রহ পোলার রাডার</span>
          <span className="hidden text-[11px] text-[var(--ds-t5)] md:inline">(ক্যাটাগরি × পাইপলাইন স্তর)</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--ds-t6)]">
          <Radar size={28} />
          <p className="text-xs">খালি মূল্যায়ন — কোনো ক্যাটাগরি/সোর্স নেই</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--color-bd)] bg-[var(--color-panel-bg)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, var(--ds-sky-soft) 0%, rgba(0,0,0,0) 48%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Toolbar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-bd)] bg-[var(--color-panel-bg)]/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Radar size={15} className="text-[var(--ds-sky)]" />
          <span className="font-serif-bn text-sm font-bold text-[var(--ds-t1)]">সংগ্রহ পোলার রাডার</span>
          <span className="hidden text-[11px] text-[var(--ds-t5)] md:inline">(ক্যাটাগরি × পাইপলাইন স্তর)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-[var(--color-bd)] bg-[var(--color-field-bg)] p-0.5">
            {(["count", "percentage"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`rounded px-2.5 py-1 text-[11px] transition-colors ${
                  metric === m ? "bg-[var(--ds-kb8)] text-[var(--ds-sky)]" : "text-[var(--ds-t5)] hover:text-[var(--ds-t1)]"
                }`}
              >
                {m === "percentage" ? "হার (%)" : "সংখ্যা"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSweepEnabled((v) => !v)}
            className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] transition-colors ${
              sweepEnabled
                ? "border-[var(--ds-sky)]/40 bg-[var(--ds-sky-soft)] text-[var(--ds-sky)]"
                : "border-[var(--color-bd)] bg-[var(--color-field-bg)] text-[var(--ds-t5)]"
            }`}
          >
            <Radio size={14} className="h-3.5 w-3.5" />
            স্ক্যান বিম
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden p-2">
        {/* Latest readout */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[46%] flex-col gap-1.5">
          <div className="rounded bg-[var(--color-panel-bg)]/90 px-2.5 py-1.5 backdrop-blur-md border border-[var(--color-bd)]">
            <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-[var(--ds-t5)]">
              <span className={`h-2 w-2 rounded-full ${running ? "bg-[#10B981] animate-pulse-glow" : "bg-[#F59E0B]"}`} />
              সর্বশেষ কনটেন্ট
            </div>
            {latest ? (
              <div key={latest.id} className="animate-slide-in">
                <div className="line-clamp-1 text-xs font-medium text-[var(--ds-t1)]">{latest.title_bn}</div>
                <div className="mt-0.5 flex gap-2 text-[10px]">
                  <span style={{ color: cats.find((c) => c.slug === latest.category)?.dot ?? "var(--ds-sky)" }}>
                    {cats.find((c) => c.slug === latest.category)?.name ?? latest.category}
                  </span>
                  <span className="text-[var(--ds-t5)]">{latest.source_name}</span>
                  <span className="text-[var(--ds-t6)]">{bnTime(latest.created_at)}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[var(--ds-t6)]">ডেটার অপেক্ষায়...</div>
            )}
          </div>
          {lockedSector !== null && activeCat && (
            <div className="pointer-events-auto inline-flex w-fit items-center gap-2 rounded border border-[var(--ds-sky)]/40 bg-[var(--ds-sky-soft)] px-2.5 py-1 text-[11px] text-[var(--ds-sky)]">
              <Lock size={12} />
              নির্বাচিত: {activeCat.name}
              <button
                onClick={() => setLockedSector(null)}
                className="ml-1 rounded bg-[var(--color-field-bg)] px-1.5 text-[10px] text-[var(--ds-t1)]"
              >
                মুছুন
              </button>
            </div>
          )}
        </div>

        {/* Tooltip */}
        {activeCat && (
          <div className="pointer-events-none absolute right-3 top-3 z-20 w-60 rounded-lg border border-[var(--ds-bd-2)] bg-[var(--color-panel-bg)]/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-start justify-between border-b border-[var(--color-bd)] pb-1.5">
              <div>
                <div className="font-serif-bn text-sm font-bold" style={{ color: activeCat.dot }}>
                  {activeCat.name}
                </div>
                <div className="text-[11px] text-[var(--ds-t5)]">পাইপলাইন স্তরসমূহ</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[var(--ds-sky)]">
                  {metric === "percentage" ? bnPct(((sectorTotals[activeIndex!] ?? 0) / grand) * 100) : bnNum(sectorTotals[activeIndex!] ?? 0)}
                </div>
                <div className="text-[10px] text-[var(--ds-t5)]">মোট</div>
              </div>
            </div>
            <div className="space-y-0.5 text-[11px]">
              {STAGES.slice().reverse().map((st) => {
                const c = stageOf.get(st.id)!(activeCat.slug);
                const isH = hoverSeg?.s === activeIndex && hoverSeg.t === st.index;
                return (
                  <div
                    key={st.id}
                    className={`flex items-center justify-between rounded px-1 ${isH ? "bg-[var(--ds-kb8)]" : ""} ${
                      visible[st.index] ? "" : "opacity-35"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[var(--ds-t5)]">
                      <span className="h-2 w-2 rounded-sm" style={{ background: st.color }} />
                      {st.label}
                    </span>
                    <span className="text-[var(--ds-t1)]">
                      {bnNum(c)}{" "}
                      <span className="text-[var(--ds-t6)]">({bnPct((c / grand) * 100)})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="h-full max-h-[560px] w-full max-w-[560px] cursor-pointer"
          onMouseLeave={() => {
            setHoveredSector(null);
            setHoverSeg(null);
          }}
        >
          <defs>
            <radialGradient id="collectorHubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style={{ stopColor: "var(--ds-sky)", stopOpacity: "0.16" }} />
              <stop offset="70%" style={{ stopColor: "var(--ds-sky)", stopOpacity: "0.03" }} />
              <stop offset="100%" style={{ stopColor: "var(--ds-sky)", stopOpacity: "0" }} />
            </radialGradient>
          </defs>

          <circle cx={CX} cy={CY} r={MAX_R} fill="url(#collectorHubGlow)" stroke="var(--ds-bd-2)" strokeWidth={1.2} />

          {/* Category bands + labels */}
          {cats.map((cat, i) => {
            const start = i * SPAN - SPAN / 2 + 0.8;
            const end = i * SPAN + SPAN / 2 - 0.8;
            const mid = i * SPAN;
            const lp = polarToCartesian(CX, CY, labelR, mid);
            const catActive = activeCat?.slug === cat.slug;
            return (
              <g key={cat.slug}>
                <path
                  d={describeAnnularWedge(CX, CY, bandIn, bandIn + 7, start, end)}
                  fill={cat.dot}
                  fillOpacity={catActive ? 1 : 0.7}
                />
                <text
                  x={lp.x}
                  y={lp.y + 5}
                  textAnchor="middle"
                  fill={cat.dot}
                  fontSize={labelSize}
                  fontWeight={700}
                  style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
                >
                  {cat.name}
                </text>
              </g>
            );
          })}

          {/* Spokes */}
          {cats.map((cat, i) => {
            const a = polarToCartesian(CX, CY, HUB, i * SPAN - SPAN / 2);
            const b = polarToCartesian(CX, CY, MAX_R, i * SPAN - SPAN / 2);
            const isBoundary = i === 0;
            return (
              <line
                key={`sp-${cat.slug}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isBoundary ? "var(--ds-bd-2)" : "var(--ds-bd)"}
                strokeWidth={isBoundary ? 1.3 : 0.8}
                strokeDasharray={isBoundary ? undefined : "3 3"}
              />
            );
          })}

          {/* Rings */}
          {rings.map((v, i) => (
            <circle
              key={`r-${v}`}
              cx={CX}
              cy={CY}
              r={vToR(v)}
              fill="none"
              stroke={i === rings.length - 1 ? "var(--ds-bd-2)" : "var(--ds-bd)"}
              strokeDasharray={i === rings.length - 1 ? undefined : "4 4"}
            />
          ))}

          {/* Active wedge highlight */}
          {activeCat && activeIndex !== null && (
            <path
              d={describeAnnularWedge(CX, CY, HUB, MAX_R, activeIndex * SPAN - SPAN / 2, activeIndex * SPAN + SPAN / 2)}
              fill="rgba(0,240,255,0.07)"
              stroke="#00f0ff"
              strokeOpacity={0.45}
              className="pointer-events-none"
            />
          )}

          {/* Stacked stage segments */}
          {wedges.map(({ cat, i, segs }) => {
            const dim =
              (hoveredSector !== null && hoveredSector !== i) ||
              (hoveredSector === null && lockedSector !== null && lockedSector !== i);
            return (
              <g
                key={`w-${cat.slug}`}
                style={{ opacity: dim ? 0.35 : 1 }}
                className="transition-opacity duration-150"
                onMouseEnter={() => setHoveredSector(i)}
                onClick={() => setLockedSector(lockedSector === i ? null : i)}
              >
                <path
                  d={describeAnnularWedge(CX, CY, HUB, MAX_R, i * SPAN - SPAN / 2, i * SPAN + SPAN / 2)}
                  fill="transparent"
                />
                {segs.map((sg) =>
                  sg.d ? (
                    <path
                      key={sg.t}
                      d={sg.d}
                      fill={sg.color}
                      fillOpacity={hoveredStage !== null && hoveredStage !== sg.t ? 0.2 : 0.9}
                      stroke={`var(--color-window)`}
                      strokeWidth={1}
                      onMouseEnter={() => setHoverSeg({ s: i, t: sg.t })}
                      onMouseLeave={() => setHoverSeg(null)}
                    />
                  ) : null,
                )}
              </g>
            );
          })}

          {/* Sweep */}
          {sweepEnabled && (
            <g className="pointer-events-none">
              <path d={describeAnnularWedge(CX, CY, HUB, MAX_R, (sweep - 30 + 360) % 360, sweep)} fill="rgba(0,240,255,0.07)" />
              <path d={describeAnnularWedge(CX, CY, HUB, MAX_R, (sweep - 10 + 360) % 360, sweep)} fill="rgba(0,240,255,0.13)" />
              {(() => {
                const p1 = polarToCartesian(CX, CY, HUB, sweep);
                const p2 = polarToCartesian(CX, CY, MAX_R, sweep);
                return (
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#00f0ff" strokeWidth={1.6} strokeOpacity={0.85} />
                );
              })()}
            </g>
          )}

          {/* Ring labels */}
          {rings.map((v) => {
            const p = polarToCartesian(CX, CY, vToR(v), 10);
            return (
              <g key={`rl-${v}`} transform={`translate(${p.x},${p.y})`} className="pointer-events-none">
                <rect x={-20} y={-9} width={40} height={17} rx={3} fill="var(--color-field-bg)" fillOpacity={0.85} stroke="var(--color-bd)" />
                <text x={0} y={4} textAnchor="middle" fill="var(--ds-t5)" fontSize={10.5}>
                  {metric === "percentage" ? `${toBn(v)}%` : toBn(v)}
                </text>
              </g>
            );
          })}

          <circle cx={CX} cy={CY} r={HUB} fill="var(--color-panel)" stroke="var(--ds-bd-2)" strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={4} fill="var(--ds-sky)" />
        </svg>
      </div>

      {/* Legend */}
      <div className="relative z-10 border-t border-[var(--color-bd)] bg-[var(--color-panel-bg)]/90 px-4 py-2.5">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ds-t5)]">
          <div className="flex items-center gap-2">
            <Layers size={14} className="h-3.5 w-3.5" />
            পাইপলাইন স্তর — ক্লিক করে ফিল্টার, হোভার করে আলাদা করুন
          </div>
          {hiddenCount > 0 && (
            <button
              onClick={() => setVisible([true, true, true, true])}
              className="flex items-center gap-1 text-[11px] text-[var(--ds-sky)] hover:underline"
            >
              <Unlock size={12} className="h-3 w-3" />
              সব স্তর দেখান ({toBn(hiddenCount)}টি লুকানো)
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {STAGES.map((st) => {
            const vis = visible[st.index];
            return (
              <button
                key={st.id}
                onClick={() => setVisible((prev) => prev.map((v, i) => (i === st.index ? !v : v)))}
                onMouseEnter={() => setHoveredStage(st.index)}
                onMouseLeave={() => setHoveredStage(null)}
                className={`rounded border p-1.5 text-left transition-all ${
                  !vis
                    ? "border-[var(--color-bd)]/50 bg-[var(--color-field-bg)]/50 opacity-40"
                    : hoveredStage === st.index
                      ? "border-[var(--ds-bd-2)] bg-[var(--ds-kb8)]"
                      : "border-[var(--color-bd)] bg-[var(--color-field-bg)] hover:border-[var(--ds-bd-2)]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: vis ? st.color : "var(--ds-t6)" }} />
                  <span className="text-[11px] font-semibold text-[var(--ds-t1)]">{st.label}</span>
                </div>
                <div className="mt-0.5 flex justify-between text-[10px]">
                  <span className="text-[var(--ds-t5)]">{bnNum(data?.totals?.[st.id] ?? 0)}</span>
                  <span className="text-[var(--ds-t1)]">
                    {metric === "percentage"
                      ? bnPct((data?.totals?.[st.id] ?? 0) * (100 / grand))
                      : bnPct(nicePct(data, st.id))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function nicePct(data: DeskRadarSnapshot | undefined, id: StageId): number {
  const tot = data?.totals;
  if (!tot) return 0;
  const sum = tot.collected + tot.queued + tot.published + tot.duplicate;
  if (sum <= 0) return 0;
  return ((tot[id] ?? 0) / sum) * 100;
}
import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Lock, Radar, Radio, Unlock } from 'lucide-react';
import {
  CATEGORIES,
  LIKE_TIERS,
  NewsPost,
  PLATFORMS,
  SECTORS,
  SECTOR_SPAN,
} from '../types/news';
import { describeAnnularWedge, polarToCartesian, RoseStats } from '../utils/polar';
import { bnCompact, bnNum, bnPct, toBn } from '../utils/bn';

interface Props {
  counts: number[][];
  stats: RoseStats;
  visibleTiers: boolean[];
  onToggleTier: (t: number) => void;
  onResetTiers: () => void;
  recentPosts: NewsPost[];
  isStreaming: boolean;
  sweepEnabled: boolean;
  onToggleSweep: () => void;
  metric: 'percentage' | 'count';
  onChangeMetric: (m: 'percentage' | 'count') => void;
  lockedSector: number | null;
  onSelectSector: (s: number | null) => void;
  hoveredSector: number | null;
  onHoverSector: (s: number | null) => void;
  hoveredTier: number | null;
  onHoverTier: (t: number | null) => void;
}

const VIEW = 720;
const CX = VIEW / 2;
const CY = VIEW / 2;
const MAX_R = 236;
const HUB = 16;

export const NewsRadar: React.FC<Props> = ({
  counts,
  stats,
  visibleTiers,
  onToggleTier,
  onResetTiers,
  recentPosts,
  isStreaming,
  sweepEnabled,
  onToggleSweep,
  metric,
  onChangeMetric,
  lockedSector,
  onSelectSector,
  hoveredSector,
  onHoverSector,
  hoveredTier,
  onHoverTier,
}) => {
  const [sweep, setSweep] = useState(0);
  const [hoverSeg, setHoverSeg] = useState<{ s: number; t: number } | null>(null);

  useEffect(() => {
    if (!sweepEnabled) return;
    let id: number;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setSweep((p) => (p + (dt / 1000) * (isStreaming ? 45 : 15)) % 360);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [sweepEnabled, isStreaming]);

  const { radialMax, rings } = useMemo(() => {
    if (metric === 'percentage') {
      const ceil = Math.ceil((Math.max(8, stats.maxSectorPct) + 1) / 4) * 4;
      const step = ceil / 4;
      return { radialMax: ceil, rings: [1, 2, 3, 4].map((i) => +(i * step).toFixed(1)) };
    }
    const step = Math.max(5, Math.ceil(Math.max(20, stats.maxSectorCount) / 4 / 5) * 5);
    return { radialMax: step * 4, rings: [step, step * 2, step * 3, step * 4] };
  }, [metric, stats.maxSectorPct, stats.maxSectorCount]);

  const vToR = (v: number) =>
    v <= 0 ? HUB : HUB + (Math.min(radialMax, v) / radialMax) * (MAX_R - HUB);

  const wedges = useMemo(() => {
    const half = SECTOR_SPAN / 2 - 1.4;
    return SECTORS.map((sec) => {
      let cum = 0;
      const segs = LIKE_TIERS.map((tier) => {
        const raw = counts[sec.index]?.[tier.index] ?? 0;
        const val = !visibleTiers[tier.index]
          ? 0
          : metric === 'percentage'
          ? stats.matrixPct[sec.index]?.[tier.index] ?? 0
          : raw;
        const start = cum;
        cum += val;
        return {
          t: tier.index,
          color: tier.color,
          d:
            val > 0.0001
              ? describeAnnularWedge(CX, CY, vToR(start), vToR(cum), sec.centerAngle - half, sec.centerAngle + half)
              : '',
        };
      });
      return { sec, segs };
    });
  }, [counts, stats.matrixPct, visibleTiers, metric, radialMax]);

  const active = hoveredSector ?? lockedSector;
  const activeSec = active !== null ? SECTORS[active] : null;
  const hiddenCount = visibleTiers.filter((v) => !v).length;
  const latest = recentPosts[0];

  return (
    <div className="relative flex flex-col h-full w-full bg-[#070B12] border border-[#1C293D] rounded-lg overflow-hidden select-none">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(0,240,255,0.06) 0%, rgba(14,21,34,0.25) 48%, rgba(7,11,18,0.95) 100%)',
        }}
      />

      {/* Toolbar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[#1C293D] bg-[#0E1522]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Radar className="w-4 h-4 text-[#00F0FF]" />
          <span className="font-display text-sm font-semibold text-[#F0F6FC]">
            সংবাদ প্রবাহ পোলার রাডার
          </span>
          <span className="hidden md:inline text-[11px] text-[#8B9EB7]">
            (ক্যাটাগরি × প্ল্যাটফর্ম × লাইক স্তর)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#070B12] p-0.5 rounded border border-[#1C293D]">
            {(['percentage', 'count'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onChangeMetric(m)}
                className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                  metric === m ? 'bg-[#1C293D] text-[#00F0FF]' : 'text-[#8B9EB7] hover:text-[#F0F6FC]'
                }`}
              >
                {m === 'percentage' ? 'হার (%)' : 'পোস্ট সংখ্যা'}
              </button>
            ))}
          </div>
          <button
            onClick={onToggleSweep}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border transition-colors ${
              sweepEnabled
                ? 'bg-[#00F0FF]/10 border-[#00F0FF]/40 text-[#00F0FF]'
                : 'bg-[#070B12] border-[#1C293D] text-[#8B9EB7]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            স্ক্যান বিম
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex-1 flex items-center justify-center min-h-[400px] p-2 overflow-hidden">
        {/* Latest post readout */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[46%]">
          <div className="px-2.5 py-1.5 rounded bg-[#0E1522]/90 border border-[#1C293D] backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[10px] text-[#8B9EB7] mb-0.5">
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-[#10B981] animate-pulse-glow' : 'bg-[#F59E0B]'}`} />
              সর্বশেষ সংগৃহীত পোস্ট
            </div>
            {latest ? (
              <div key={latest.id} className="animate-slide-in">
                <div className="text-xs text-[#F0F6FC] font-medium line-clamp-1">{latest.headline}</div>
                <div className="text-[10px] mt-0.5 flex gap-2">
                  <span style={{ color: CATEGORIES[latest.predicted].color }}>
                    {CATEGORIES[latest.predicted].name}
                  </span>
                  <span className="text-[#8B9EB7]">{PLATFORMS[latest.platform].name}</span>
                  <span style={{ color: LIKE_TIERS[latest.tierIndex].color }}>
                    ❤ {bnCompact(latest.likes)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#4A5D75]">ডেটার অপেক্ষায়...</div>
            )}
          </div>
          {lockedSector !== null && (
            <div className="pointer-events-auto inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/40 text-[#00F0FF] text-[11px] w-fit">
              <Lock className="w-3 h-3" />
              নির্বাচিত: {CATEGORIES[SECTORS[lockedSector].category].name} · {PLATFORMS[SECTORS[lockedSector].platform].name}
              <button onClick={() => onSelectSector(null)} className="ml-1 px-1.5 rounded bg-[#070B12] text-[#F0F6FC] text-[10px]">
                মুছুন
              </button>
            </div>
          )}
        </div>

        {/* Tooltip */}
        {activeSec && (
          <div className="pointer-events-none absolute top-3 right-3 z-20 w-60 rounded-lg p-3 border border-[#2E4466] shadow-2xl bg-[#0E1522]/90 backdrop-blur-md">
            <div className="flex items-start justify-between border-b border-[#1C293D] pb-1.5 mb-2">
              <div>
                <div className="font-display text-sm font-bold" style={{ color: CATEGORIES[activeSec.category].color }}>
                  {CATEGORIES[activeSec.category].emoji} {CATEGORIES[activeSec.category].name}
                </div>
                <div className="text-[11px] text-[#8B9EB7]">প্ল্যাটফর্ম: {PLATFORMS[activeSec.platform].name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#00F0FF]">{bnPct(stats.sectorPct[activeSec.index])}</div>
                <div className="text-[10px] text-[#8B9EB7]">{bnNum(stats.sectorTotals[activeSec.index])} পোস্ট</div>
              </div>
            </div>
            <div className="space-y-0.5 text-[11px]">
              {LIKE_TIERS.slice().reverse().map((tier) => {
                const c = counts[activeSec.index]?.[tier.index] ?? 0;
                const isH = hoverSeg?.s === activeSec.index && hoverSeg.t === tier.index;
                return (
                  <div
                    key={tier.index}
                    className={`flex justify-between items-center px-1 rounded ${isH ? 'bg-[#1C293D]' : ''} ${
                      visibleTiers[tier.index] ? '' : 'opacity-35'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[#8B9EB7]">
                      <span className="w-2 h-2 rounded-sm" style={{ background: tier.color }} />
                      ❤ {tier.label}
                    </span>
                    <span className="text-[#F0F6FC]">
                      {bnNum(c)} <span className="text-[#4A5D75]">({bnPct(stats.matrixPct[activeSec.index]?.[tier.index] ?? 0)})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="w-full h-full max-w-[660px] max-h-[660px] cursor-pointer"
          onMouseLeave={() => {
            onHoverSector(null);
            setHoverSeg(null);
          }}
        >
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.16" />
              <stop offset="70%" stopColor="#00F0FF" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx={CX} cy={CY} r={MAX_R} fill="url(#hubGlow)" stroke="#263852" strokeWidth={1.2} />

          {/* Category bands */}
          {CATEGORIES.map((cat) => {
            const start = cat.index * 60 - SECTOR_SPAN / 2 + 0.8;
            const end = cat.index * 60 + 60 - SECTOR_SPAN / 2 - 0.8;
            const mid = cat.index * 60 + 20;
            const lp = polarToCartesian(CX, CY, MAX_R + 62, mid);
            const catActive = activeSec?.category === cat.index;
            return (
              <g key={cat.id}>
                <path
                  d={describeAnnularWedge(CX, CY, MAX_R + 34, MAX_R + 40, start, end)}
                  fill={cat.color}
                  fillOpacity={catActive ? 1 : 0.7}
                />
                <text
                  x={lp.x}
                  y={lp.y + 5}
                  textAnchor="middle"
                  fill={cat.color}
                  fontSize={catActive ? 17 : 15}
                  fontWeight={700}
                >
                  {cat.emoji} {cat.name}
                </text>
              </g>
            );
          })}

          {/* Spokes & platform labels */}
          {SECTORS.map((sec) => {
            const a = polarToCartesian(CX, CY, HUB, sec.centerAngle - SECTOR_SPAN / 2);
            const b = polarToCartesian(CX, CY, MAX_R, sec.centerAngle - SECTOR_SPAN / 2);
            const isBoundary = sec.platform === 0;
            const lp = polarToCartesian(CX, CY, MAX_R + 18, sec.centerAngle);
            const isActive = active === sec.index;
            return (
              <g key={`sp-${sec.index}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isBoundary ? '#2E4466' : '#162234'}
                  strokeWidth={isBoundary ? 1.3 : 0.8}
                  strokeDasharray={isBoundary ? undefined : '3 3'}
                />
                <text
                  x={lp.x}
                  y={lp.y + 4}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={isActive ? 700 : 500}
                  fill={isActive ? '#00F0FF' : PLATFORMS[sec.platform].color}
                  fillOpacity={isActive ? 1 : 0.8}
                  onClick={() => onSelectSector(lockedSector === sec.index ? null : sec.index)}
                  onMouseEnter={() => onHoverSector(sec.index)}
                >
                  {PLATFORMS[sec.platform].short}
                </text>
              </g>
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
              stroke={i === rings.length - 1 ? '#263852' : '#1A273B'}
              strokeDasharray={i === rings.length - 1 ? undefined : '4 4'}
            />
          ))}

          {/* Active sector highlight */}
          {activeSec && (
            <path
              d={describeAnnularWedge(CX, CY, HUB, MAX_R, activeSec.centerAngle - SECTOR_SPAN / 2, activeSec.centerAngle + SECTOR_SPAN / 2)}
              fill="rgba(0,240,255,0.07)"
              stroke="#00F0FF"
              strokeOpacity={0.45}
              className="pointer-events-none"
            />
          )}

          {/* Stacked polar columns */}
          {wedges.map(({ sec, segs }) => {
            const dim =
              (hoveredSector !== null && hoveredSector !== sec.index) ||
              (hoveredSector === null && lockedSector !== null && lockedSector !== sec.index);
            return (
              <g
                key={`w-${sec.index}`}
                style={{ opacity: dim ? 0.35 : 1 }}
                className="transition-opacity duration-150"
                onMouseEnter={() => onHoverSector(sec.index)}
                onClick={() => onSelectSector(lockedSector === sec.index ? null : sec.index)}
              >
                <path
                  d={describeAnnularWedge(CX, CY, HUB, MAX_R, sec.centerAngle - SECTOR_SPAN / 2, sec.centerAngle + SECTOR_SPAN / 2)}
                  fill="transparent"
                />
                {segs.map((sg) =>
                  sg.d ? (
                    <path
                      key={sg.t}
                      d={sg.d}
                      fill={sg.color}
                      fillOpacity={hoveredTier !== null && hoveredTier !== sg.t ? 0.2 : 0.9}
                      stroke="#070B12"
                      strokeWidth={1}
                      onMouseEnter={() => setHoverSeg({ s: sec.index, t: sg.t })}
                      onMouseLeave={() => setHoverSeg(null)}
                    />
                  ) : null
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
                return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#00F0FF" strokeWidth={1.6} strokeOpacity={0.85} />;
              })()}
            </g>
          )}

          {/* Post blips */}
          <g className="pointer-events-none">
            {recentPosts.slice(0, 12).map((p, i) => {
              const ratio = Math.min(1, Math.max(0.08, Math.log10(p.likes + 1) / Math.log10(200000)));
              const pt = polarToCartesian(CX, CY, HUB + ratio * (MAX_R - HUB), SECTORS[p.sectorIndex].centerAngle + p.jitter * 0.6);
              return (
                <g key={p.id} style={{ opacity: Math.max(0.15, 1 - i * 0.08) }}>
                  {i === 0 && <circle cx={pt.x} cy={pt.y} r={10} fill="none" stroke="#00F0FF" strokeWidth={1.5} />}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={i === 0 ? 4.5 : 3}
                    fill={i === 0 ? '#fff' : p.flags.length ? '#F43F5E' : LIKE_TIERS[p.tierIndex].color}
                    stroke="#070B12"
                  />
                </g>
              );
            })}
          </g>

          {/* Ring labels */}
          {rings.map((v) => {
            const p = polarToCartesian(CX, CY, vToR(v), 10);
            return (
              <g key={`rl-${v}`} transform={`translate(${p.x},${p.y})`} className="pointer-events-none">
                <rect x={-20} y={-9} width={40} height={17} rx={3} fill="#070B12" fillOpacity={0.85} stroke="#1C293D" />
                <text x={0} y={4} textAnchor="middle" fill="#8B9EB7" fontSize={10.5}>
                  {metric === 'percentage' ? `${toBn(v)}%` : toBn(v)}
                </text>
              </g>
            );
          })}

          <circle cx={CX} cy={CY} r={HUB} fill="#0E1522" stroke="#2E4466" strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={4} fill="#00F0FF" />
        </svg>
      </div>

      {/* Legend */}
      <div className="relative z-10 px-4 py-2.5 bg-[#0E1522]/90 border-t border-[#1C293D]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 text-[11px] text-[#8B9EB7]">
            <Layers className="w-3.5 h-3.5" />
            লাইক/এনগেজমেন্ট স্তর — ক্লিক করে ফিল্টার, হোভার করে আলাদা করুন
          </div>
          {hiddenCount > 0 && (
            <button onClick={onResetTiers} className="flex items-center gap-1 text-[11px] text-[#00F0FF] hover:underline">
              <Unlock className="w-3 h-3" />
              সব স্তর দেখান ({toBn(hiddenCount)}টি লুকানো)
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {LIKE_TIERS.map((tier) => {
            const vis = visibleTiers[tier.index];
            return (
              <button
                key={tier.index}
                onClick={() => onToggleTier(tier.index)}
                onMouseEnter={() => onHoverTier(tier.index)}
                onMouseLeave={() => onHoverTier(null)}
                className={`p-1.5 rounded border text-left transition-all ${
                  !vis
                    ? 'opacity-40 bg-[#070B12]/50 border-[#1C293D]/50'
                    : hoveredTier === tier.index
                    ? 'bg-[#1C293D] border-[#2E4466]'
                    : 'bg-[#070B12] border-[#1C293D] hover:border-[#2E4466]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: vis ? tier.color : '#4A5D75' }} />
                  <span className="text-[11px] font-semibold text-[#F0F6FC]">❤ {tier.label}</span>
                </div>
                <div className="flex justify-between text-[10px] mt-0.5">
                  <span className="text-[#8B9EB7]">{tier.name}</span>
                  <span className="text-[#F0F6FC]">{bnPct(stats.tierPct[tier.index] ?? 0)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

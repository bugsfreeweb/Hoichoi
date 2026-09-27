import React from 'react';
import { BrainCircuit, CheckCircle2, Clock, Database, Radio, ShieldAlert } from 'lucide-react';
import {
  CATEGORIES,
  LIKE_TIERS,
  NewsPost,
  PLATFORMS,
  PostStatus,
  SENTIMENT_LABEL,
  STATUS_LABEL,
  Sentiment,
} from '../types/news';
import { RoseStats } from '../utils/polar';
import { bnCompact, bnNum, bnPct, bnTime } from '../utils/bn';

interface Props {
  stats: RoseStats;
  posts: NewsPost[];
  statusCounts: Record<PostStatus, number>;
  moderationCount: number;
  liveAccuracy: number;
  modelAccuracy: number;
  lockedSector: number | null;
  onSelectSector: (s: number | null) => void;
  onHoverSector: (s: number | null) => void;
  onOpenModeration: () => void;
}

export const DashboardSide: React.FC<Props> = ({
  stats,
  posts,
  statusCounts,
  moderationCount,
  liveAccuracy,
  modelAccuracy,
  lockedSector,
  onSelectSector,
  onHoverSector,
  onOpenModeration,
}) => {
  const sentimentByCat = CATEGORIES.map((c) => {
    const s: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
    posts.forEach((p) => {
      if (p.predicted === c.index) s[p.sentiment]++;
    });
    return s;
  });
  const maxCat = Math.max(1, ...stats.categoryTotals);

  return (
    <aside className="w-full lg:w-[400px] xl:w-[420px] shrink-0 flex flex-col gap-3 lg:h-full lg:overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 shrink-0">
        <div className="p-3 rounded-lg bg-[#0E1522] border border-[#1C293D]">
          <div className="flex justify-between text-[11px] text-[#8B9EB7] mb-1">
            <span>মোট সংগৃহীত পোস্ট</span>
            <Database className="w-3.5 h-3.5 text-[#00F0FF]" />
          </div>
          <div className="text-2xl font-bold text-[#F0F6FC] leading-tight">{bnNum(stats.total)}</div>
          <div className="text-[11px] text-[#8B9EB7] mt-0.5">
            ফেসবুক {bnNum(stats.platformTotals[0])} · ইউটিউব {bnNum(stats.platformTotals[1])} · পোর্টাল {bnNum(stats.platformTotals[2])}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-[#0E1522] border border-[#1C293D]">
          <div className="flex justify-between text-[11px] text-[#8B9EB7] mb-1">
            <span>প্রকাশিত / অপ্রকাশিত</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold leading-tight">
            <span className="text-[#22C55E]">{bnNum(statusCounts.published)}</span>
            <span className="text-[#4A5D75] text-base"> / </span>
            <span className="text-[#F59E0B] text-xl">{bnNum(statusCounts.unpublished)}</span>
          </div>
          <div className="text-[11px] text-[#8B9EB7] mt-0.5">
            প্রত্যাখ্যাত {bnNum(statusCounts.rejected)} · অপেক্ষমাণ {bnNum(statusCounts.pending)}
          </div>
        </div>
        <button
          onClick={onOpenModeration}
          className="p-3 rounded-lg bg-[#0E1522] border border-[#1C293D] hover:border-[#F43F5E]/50 text-left transition-colors"
        >
          <div className="flex justify-between text-[11px] text-[#8B9EB7] mb-1">
            <span>মডারেশন অপেক্ষমাণ</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#F43F5E]" />
          </div>
          <div className="text-2xl font-bold text-[#F43F5E] leading-tight">{bnNum(moderationCount)}</div>
          <div className="text-[11px] text-[#8B9EB7] mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> পর্যালোচনার জন্য ক্লিক করুন →
          </div>
        </button>
        <div className="p-3 rounded-lg bg-[#0E1522] border border-[#1C293D]">
          <div className="flex justify-between text-[11px] text-[#8B9EB7] mb-1">
            <span>AI শ্রেণিবিন্যাস নির্ভুলতা</span>
            <BrainCircuit className="w-3.5 h-3.5 text-[#A78BFA]" />
          </div>
          <div className="text-2xl font-bold text-[#A78BFA] leading-tight">{bnPct(liveAccuracy * 100)}</div>
          <div className="mt-1 h-1.5 bg-[#070B12] rounded overflow-hidden">
            <div className="h-full bg-[#A78BFA]" style={{ width: `${liveAccuracy * 100}%` }} />
          </div>
          <div className="text-[10px] text-[#8B9EB7] mt-0.5">মডেল বেঞ্চমার্ক: {bnPct(modelAccuracy * 100)}</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-lg bg-[#0E1522] border border-[#1C293D] overflow-hidden shrink-0">
        <div className="px-3.5 py-2 border-b border-[#1C293D] text-xs font-semibold text-[#F0F6FC]">
          ক্যাটাগরি অনুযায়ী পোস্ট সংখ্যা ও অনুভূতি
        </div>
        <div className="divide-y divide-[#1C293D]/50">
          {CATEGORIES.map((c) => {
            const total = stats.categoryTotals[c.index];
            const sent = sentimentByCat[c.index];
            const sTotal = Math.max(1, sent.positive + sent.neutral + sent.negative);
            const catLocked = lockedSector !== null && Math.floor(lockedSector / 3) === c.index;
            return (
              <div key={c.id} className={`px-3.5 py-1.5 ${catLocked ? 'bg-[#00F0FF]/5' : ''}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold" style={{ color: c.color }}>
                    {c.emoji} {c.name}
                  </span>
                  <span className="text-[#F0F6FC]">
                    {bnNum(total)} <span className="text-[#8B9EB7] text-[10px]">({bnPct(stats.visibleTotal ? (total / stats.visibleTotal) * 100 : 0)})</span>
                  </span>
                </div>
                <div className="flex gap-1 mt-1">
                  {PLATFORMS.map((p) => {
                    const sIdx = c.index * 3 + p.index;
                    return (
                      <button
                        key={p.id}
                        onMouseEnter={() => onHoverSector(sIdx)}
                        onMouseLeave={() => onHoverSector(null)}
                        onClick={() => onSelectSector(lockedSector === sIdx ? null : sIdx)}
                        className={`flex-1 text-[10px] rounded px-1 py-0.5 border transition-colors ${
                          lockedSector === sIdx
                            ? 'border-[#00F0FF] text-[#00F0FF]'
                            : 'border-[#1C293D] text-[#8B9EB7] hover:text-[#F0F6FC]'
                        }`}
                      >
                        {p.short} {bnNum(stats.sectorTotals[sIdx])}
                      </button>
                    );
                  })}
                </div>
                <div className="flex h-1.5 mt-1 rounded overflow-hidden bg-[#070B12]" style={{ width: `${Math.max(12, (total / maxCat) * 100)}%` }}>
                  {(['positive', 'neutral', 'negative'] as Sentiment[]).map((s) => (
                    <div key={s} style={{ width: `${(sent[s] / sTotal) * 100}%`, background: SENTIMENT_LABEL[s].color }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-3.5 py-1.5 flex gap-3 text-[10px] text-[#8B9EB7] border-t border-[#1C293D]">
          {(['positive', 'neutral', 'negative'] as Sentiment[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: SENTIMENT_LABEL[s].color }} />
              {SENTIMENT_LABEL[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* Live feed */}
      <div className="flex-1 min-h-[220px] flex flex-col rounded-lg bg-[#0E1522] border border-[#1C293D] overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#1C293D]">
          <span className="flex items-center gap-2 text-xs font-semibold text-[#F0F6FC]">
            <Radio className="w-3.5 h-3.5 text-[#10B981]" />
            লাইভ পোস্ট ফিড
          </span>
          <span className="text-[10px] text-[#8B9EB7]">সর্বশেষ ১০টি</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#1C293D]/40">
          {posts.slice(0, 10).map((p, i) => (
            <div
              key={p.id}
              onMouseEnter={() => onHoverSector(p.sectorIndex)}
              onMouseLeave={() => onHoverSector(null)}
              className={`px-3 py-1.5 cursor-default ${i === 0 ? 'bg-[#00F0FF]/5 animate-slide-in' : 'hover:bg-[#1C293D]/40'}`}
            >
              <div className="text-xs text-[#F0F6FC] line-clamp-1">{p.headline}</div>
              <div className="flex items-center gap-2 text-[10px] mt-0.5">
                <span className="text-[#4A5D75]">{bnTime(p.ts)}</span>
                <span style={{ color: CATEGORIES[p.predicted].color }}>{CATEGORIES[p.predicted].name}</span>
                <span className="text-[#8B9EB7]">{PLATFORMS[p.platform].short}</span>
                <span style={{ color: LIKE_TIERS[p.tierIndex].color }}>❤ {bnCompact(p.likes)}</span>
                <span className="text-[#8B9EB7]">AI {bnPct(p.confidence * 100, 0)}</span>
                <span
                  className="ml-auto px-1.5 rounded"
                  style={{
                    color: p.moderation === 'flagged' ? '#F43F5E' : STATUS_LABEL[p.status].color,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  {p.moderation === 'flagged' ? '⚠ ফ্ল্যাগড' : STATUS_LABEL[p.status].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

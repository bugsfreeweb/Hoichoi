import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCheck, CheckCircle2, EyeOff, ShieldAlert, XCircle } from 'lucide-react';
import { CATEGORIES, FLAGS, FlagId, NewsPost, PLATFORMS, PostStatus, SENTIMENT_LABEL } from '../types/news';
import { bnAgo, bnCompact, bnNum, bnPct, toBn } from '../utils/bn';

interface Props {
  posts: NewsPost[];
  resolvedCount: number;
  onSetStatus: (id: string, status: PostStatus, note: string) => void;
  onCorrect: (id: string, newCat: number) => void;
  onBulkApprove: () => void;
}

export const ModerationQueue: React.FC<Props> = ({ posts, resolvedCount, onSetStatus, onCorrect, onBulkApprove }) => {
  const [view, setView] = useState<'all' | 'flagged' | 'review'>('all');
  const [flagFilter, setFlagFilter] = useState<FlagId | null>(null);

  const queue = useMemo(() => posts.filter((p) => p.moderation !== 'cleared'), [posts]);
  const flagCounts = useMemo(() => {
    const m: Partial<Record<FlagId, number>> = {};
    queue.forEach((p) => p.flags.forEach((f) => (m[f] = (m[f] ?? 0) + 1)));
    return m;
  }, [queue]);

  const shown = queue
    .filter((p) => view === 'all' || p.moderation === view)
    .filter((p) => !flagFilter || p.flags.includes(flagFilter))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 60);

  const flaggedN = queue.filter((p) => p.moderation === 'flagged').length;
  const reviewN = queue.length - flaggedN;
  const lowRiskN = queue.filter((p) => p.moderation === 'review' && p.risk < 0.4).length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-3 p-3">
      <aside className="flex flex-col gap-3">
        <div className="rounded-lg bg-[#0E1522] border border-[#1C293D] p-4">
          <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC] mb-3">
            <ShieldAlert className="w-4 h-4 text-[#F43F5E]" /> মডারেশন সারসংক্ষেপ
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-[#070B12] border border-[#1C293D]">
              <div className="text-[10px] text-[#8B9EB7]">AI ফ্ল্যাগড</div>
              <div className="text-xl font-bold text-[#F43F5E]">{bnNum(flaggedN)}</div>
            </div>
            <div className="p-2 rounded bg-[#070B12] border border-[#1C293D]">
              <div className="text-[10px] text-[#8B9EB7]">কম আস্থা (পর্যালোচনা)</div>
              <div className="text-xl font-bold text-[#FACC15]">{bnNum(reviewN)}</div>
            </div>
            <div className="p-2 rounded bg-[#070B12] border border-[#1C293D] col-span-2">
              <div className="text-[10px] text-[#8B9EB7]">এই সেশনে নিষ্পত্তি</div>
              <div className="text-xl font-bold text-[#22C55E]">{bnNum(resolvedCount)}</div>
            </div>
          </div>
          <button
            onClick={onBulkApprove}
            disabled={lowRiskN === 0}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/25 disabled:opacity-40"
          >
            <CheckCheck className="w-4 h-4" /> সব কম-ঝুঁকির পোস্ট অনুমোদন ({bnNum(lowRiskN)})
          </button>
        </div>

        <div className="rounded-lg bg-[#0E1522] border border-[#1C293D] p-4">
          <h3 className="text-xs font-semibold text-[#F0F6FC] mb-2">ফ্ল্যাগের ধরন অনুযায়ী</h3>
          <div className="space-y-1">
            {(Object.keys(FLAGS) as FlagId[]).map((f) => (
              <button
                key={f}
                onClick={() => setFlagFilter(flagFilter === f ? null : f)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs border transition-colors ${
                  flagFilter === f ? 'border-[#00F0FF] bg-[#00F0FF]/5' : 'border-transparent hover:bg-[#1C293D]/50'
                }`}
              >
                <span className="flex items-center gap-2" style={{ color: FLAGS[f].color }}>
                  <AlertTriangle className="w-3 h-3" /> {FLAGS[f].label}
                </span>
                <span className="text-[#F0F6FC]">{bnNum(flagCounts[f] ?? 0)}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="rounded-lg bg-[#0E1522] border border-[#1C293D] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1C293D] flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-[#F0F6FC]">
            মডারেশন তালিকা <span className="text-xs text-[#8B9EB7] font-normal">(ঝুঁকি অনুযায়ী সাজানো)</span>
          </h2>
          <div className="flex bg-[#070B12] p-0.5 rounded border border-[#1C293D]">
            {([
              ['all', `সব (${bnNum(queue.length)})`],
              ['flagged', `ফ্ল্যাগড (${bnNum(flaggedN)})`],
              ['review', `পর্যালোচনা (${bnNum(reviewN)})`],
            ] as const).map(([id, l]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`px-2.5 py-1 text-xs rounded ${view === id ? 'bg-[#1C293D] text-[#00F0FF]' : 'text-[#8B9EB7]'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#1C293D]/60 max-h-[calc(100vh-170px)] overflow-y-auto">
          {shown.length === 0 && (
            <div className="p-10 text-center text-sm text-[#4A5D75]">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#22C55E]" />
              মডারেশন তালিকা খালি — সব পোস্ট নিষ্পত্তি হয়েছে
            </div>
          )}
          {shown.map((p) => {
            const riskColor = p.risk > 0.7 ? '#F43F5E' : p.risk > 0.4 ? '#FACC15' : '#22C55E';
            return (
              <div key={p.id} className="p-4 hover:bg-[#1C293D]/20 animate-slide-in">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 text-[10px] text-[#8B9EB7] mb-1">
                      <span>{p.id}</span>
                      <span>· {PLATFORMS[p.platform].name}</span>
                      <span>· {p.source}</span>
                      <span>· {bnAgo(p.ts)}</span>
                    </div>
                    <div className="text-sm text-[#F0F6FC] font-medium">{p.headline}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.flags.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-semibold border" style={{ color: FLAGS[f].color, borderColor: `${FLAGS[f].color}55`, background: `${FLAGS[f].color}14` }}>
                          ⚠ {FLAGS[f].label}
                        </span>
                      ))}
                      {p.moderation === 'review' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#FACC15] border border-[#FACC15]/40 bg-[#FACC15]/10">
                          কম AI আস্থা — মানব যাচাই প্রয়োজন
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#8B9EB7]">
                      <span>
                        AI ক্যাটাগরি: <span style={{ color: CATEGORIES[p.predicted].color }} className="font-semibold">{CATEGORIES[p.predicted].name}</span> ({bnPct(p.confidence * 100, 0)})
                      </span>
                      <span>অনুভূতি: <span style={{ color: SENTIMENT_LABEL[p.sentiment].color }}>{SENTIMENT_LABEL[p.sentiment].label}</span></span>
                      <span>❤ {bnCompact(p.likes)} · শেয়ার {bnCompact(p.shares)} · মন্তব্য {bnCompact(p.comments)}</span>
                    </div>
                  </div>

                  <div className="w-44 shrink-0">
                    <div className="flex justify-between text-[10px] text-[#8B9EB7]">
                      <span>ঝুঁকি স্কোর</span>
                      <span style={{ color: riskColor }} className="font-bold">{toBn(Math.round(p.risk * 100))}/১০০</span>
                    </div>
                    <div className="h-1.5 bg-[#070B12] rounded overflow-hidden mt-1">
                      <div className="h-full" style={{ width: `${p.risk * 100}%`, background: riskColor }} />
                    </div>
                    <select
                      value={p.predicted}
                      onChange={(e) => onCorrect(p.id, +e.target.value)}
                      className="mt-2 w-full bg-[#070B12] border border-[#1C293D] rounded px-2 py-1 text-[11px] text-[#F0F6FC]"
                      title="ক্যাটাগরি সংশোধন"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.index}>ক্যাটাগরি: {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => onSetStatus(p.id, 'published', 'মডারেটর অনুমোদিত')} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25">
                    <CheckCircle2 className="w-3.5 h-3.5" /> অনুমোদন ও প্রকাশ
                  </button>
                  <button onClick={() => onSetStatus(p.id, 'unpublished', 'যাচাই সাপেক্ষে স্থগিত')} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25">
                    <EyeOff className="w-3.5 h-3.5" /> অপ্রকাশিত রাখুন
                  </button>
                  <button
                    onClick={() => onSetStatus(p.id, 'rejected', p.flags.length ? `নীতিমালা লঙ্ঘন: ${FLAGS[p.flags[0]].label}` : 'অপ্রাসঙ্গিক কনটেন্ট')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25"
                  >
                    <XCircle className="w-3.5 h-3.5" /> প্রত্যাখ্যান
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

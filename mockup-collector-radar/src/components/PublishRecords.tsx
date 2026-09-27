import React, { useMemo, useState } from 'react';
import { EyeOff, FileCheck2, History, Search, Send } from 'lucide-react';
import {
  ACTION_LABEL,
  CATEGORIES,
  NewsPost,
  PLATFORMS,
  PostStatus,
  PublishLog,
  STATUS_LABEL,
} from '../types/news';
import { bnAgo, bnCompact, bnNum, bnPct, bnTime } from '../utils/bn';

interface Props {
  posts: NewsPost[];
  logs: PublishLog[];
  statusCounts: Record<PostStatus, number>;
  onSetStatus: (id: string, status: PostStatus, note: string) => void;
}

type Filter = 'all' | PostStatus;

export const PublishRecords: React.FC<Props> = ({ posts, logs, statusCounts, onSetStatus }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [cat, setCat] = useState<number | -1>(-1);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(40);

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (filter === 'all' || p.status === filter) &&
          (cat === -1 || p.predicted === cat) &&
          (!q || p.headline.includes(q) || p.source.includes(q) || p.id.includes(q))
      ),
    [posts, filter, cat, q]
  );

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'সব', n: posts.length },
    { id: 'published', label: 'প্রকাশিত', n: statusCounts.published },
    { id: 'unpublished', label: 'অপ্রকাশিত', n: statusCounts.unpublished },
    { id: 'pending', label: 'অপেক্ষমাণ', n: statusCounts.pending },
    { id: 'rejected', label: 'প্রত্যাখ্যাত', n: statusCounts.rejected },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-3 p-3">
      <section className="rounded-lg bg-[#0E1522] border border-[#1C293D] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#1C293D] flex flex-wrap items-center gap-2 justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC]">
            <FileCheck2 className="w-4 h-4 text-[#22C55E]" /> প্রকাশ / অপ্রকাশ রেকর্ড
          </h2>
          <div className="flex items-center gap-2 bg-[#070B12] border border-[#1C293D] rounded px-2 py-1">
            <Search className="w-3.5 h-3.5 text-[#8B9EB7]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="শিরোনাম, সূত্র বা আইডি খুঁজুন..."
              className="bg-transparent text-xs text-[#F0F6FC] focus:outline-none w-52 placeholder:text-[#4A5D75]"
            />
          </div>
        </div>
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-[#1C293D]">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded text-xs border ${
                filter === f.id ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10' : 'border-[#1C293D] text-[#8B9EB7] hover:text-[#F0F6FC]'
              }`}
            >
              {f.label} ({bnNum(f.n)})
            </button>
          ))}
          <select
            value={cat}
            onChange={(e) => setCat(+e.target.value)}
            className="ml-auto bg-[#070B12] border border-[#1C293D] rounded px-2 py-1 text-xs text-[#F0F6FC]"
          >
            <option value={-1}>সব ক্যাটাগরি</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.index}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#070B12]/60 text-[#8B9EB7]">
              <tr>
                {['আইডি / সময়', 'শিরোনাম', 'ক্যাটাগরি', 'প্ল্যাটফর্ম', 'লাইক', 'AI আস্থা', 'অবস্থা', 'কার্যক্রম'].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C293D]/50">
              {filtered.slice(0, limit).map((p) => (
                <tr key={p.id} className="hover:bg-[#1C293D]/30">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-[#F0F6FC]">{p.id}</div>
                    <div className="text-[10px] text-[#4A5D75]">{bnTime(p.ts)}</div>
                  </td>
                  <td className="px-3 py-2 max-w-[320px]">
                    <div className="text-[#F0F6FC] line-clamp-1">{p.headline}</div>
                    <div className="text-[10px] text-[#8B9EB7]">সূত্র: {p.source}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: CATEGORIES[p.predicted].color }}>
                    {CATEGORIES[p.predicted].name}
                    {p.corrected && <span className="ml-1 text-[9px] text-[#A78BFA]">(সংশোধিত)</span>}
                  </td>
                  <td className="px-3 py-2 text-[#8B9EB7] whitespace-nowrap">{PLATFORMS[p.platform].name}</td>
                  <td className="px-3 py-2 text-[#F0F6FC] whitespace-nowrap">❤ {bnCompact(p.likes)}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: p.confidence >= 0.8 ? '#22C55E' : '#FACC15' }}>
                    {bnPct(p.confidence * 100, 0)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: STATUS_LABEL[p.status].color, background: `${STATUS_LABEL[p.status].color}1f` }}>
                      {STATUS_LABEL[p.status].label}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.status === 'published' ? (
                      <button
                        onClick={() => onSetStatus(p.id, 'unpublished', 'রেকর্ড থেকে অপ্রকাশ')}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 text-[11px]"
                      >
                        <EyeOff className="w-3 h-3" /> অপ্রকাশ
                      </button>
                    ) : (
                      <button
                        onClick={() => onSetStatus(p.id, 'published', 'রেকর্ড থেকে প্রকাশ')}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 text-[11px]"
                      >
                        <Send className="w-3 h-3" /> প্রকাশ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-8 text-center text-sm text-[#4A5D75]">কোনো রেকর্ড পাওয়া যায়নি</div>}
        </div>
        {filtered.length > limit && (
          <button onClick={() => setLimit((l) => l + 40)} className="m-3 py-1.5 rounded border border-[#1C293D] text-xs text-[#00F0FF] hover:bg-[#1C293D]">
            আরও দেখান ({bnNum(filtered.length - limit)}টি বাকি)
          </button>
        )}
      </section>

      <section className="rounded-lg bg-[#0E1522] border border-[#1C293D] overflow-hidden flex flex-col max-h-[calc(100vh-150px)]">
        <div className="px-4 py-3 border-b border-[#1C293D] flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC]">
            <History className="w-4 h-4 text-[#00F0FF]" /> অডিট লগ
          </h2>
          <span className="text-[10px] text-[#8B9EB7]">মোট {bnNum(logs.length)}টি কার্যক্রম</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#1C293D]/50">
          {logs.slice(0, 120).map((l) => (
            <div key={l.id} className="px-4 py-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold" style={{ color: ACTION_LABEL[l.action].color }}>{ACTION_LABEL[l.action].label}</span>
                <span className="text-[#4A5D75]">{bnAgo(l.ts)}</span>
              </div>
              <div className="text-xs text-[#F0F6FC] line-clamp-1 mt-0.5">{l.headline}</div>
              <div className="text-[10px] text-[#8B9EB7] mt-0.5 flex gap-2">
                <span style={{ color: CATEGORIES[l.category].color }}>{CATEGORIES[l.category].name}</span>
                <span>· {l.actor}</span>
                <span className="truncate">· {l.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import {
  BrainCircuit,
  Download,
  FileCheck2,
  LayoutDashboard,
  Pause,
  Play,
  PlusCircle,
  Radar,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { AppTab, TREND_MODES, TrendMode } from '../types/news';
import { bnNum, toBn } from '../utils/bn';

interface Props {
  tab: AppTab;
  onTab: (t: AppTab) => void;
  isStreaming: boolean;
  onToggleStream: () => void;
  intervalMs: number;
  onInterval: (ms: number) => void;
  trend: TrendMode;
  onTrend: (t: TrendMode) => void;
  onCollectOne: () => void;
  onCollectBurst: () => void;
  onReset: () => void;
  onExport: () => void;
  moderationCount: number;
  recordCount: number;
  activeModelLabel: string;
}

export const Header: React.FC<Props> = ({
  tab,
  onTab,
  isStreaming,
  onToggleStream,
  intervalMs,
  onInterval,
  trend,
  onTrend,
  onCollectOne,
  onCollectBurst,
  onReset,
  onExport,
  moderationCount,
  recordCount,
  activeModelLabel,
}) => {
  const tabs: { id: AppTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'রাডার ড্যাশবোর্ড', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'ai', label: 'AI বিশ্লেষণ ও মডেল', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'records', label: 'প্রকাশ/অপ্রকাশ রেকর্ড', icon: <FileCheck2 className="w-4 h-4" />, badge: recordCount },
    { id: 'moderation', label: 'মডারেশন তালিকা', icon: <ShieldAlert className="w-4 h-4" />, badge: moderationCount },
  ];

  return (
    <header className="w-full bg-[#0E1522] border-b border-[#1C293D] z-30">
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#070B12] border border-[#2E4466] flex items-center justify-center">
            <Radar className="w-5 h-5 text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold text-[#F0F6FC]">
                সংবাদ রাডার <span className="text-[#00F0FF] text-xs">// সোশ্যাল মিডিয়া মনিটর</span>
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isStreaming
                    ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                    : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-[#10B981] animate-pulse-glow' : 'bg-[#F59E0B]'}`} />
                {isStreaming ? `লাইভ · ${toBn((1000 / intervalMs).toFixed(1))} পোস্ট/সে.` : 'বিরতি'}
              </span>
            </div>
            <p className="text-[11px] text-[#8B9EB7]">সক্রিয় মডেল: {activeModelLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#070B12] px-2.5 py-1 rounded border border-[#1C293D]">
            <TrendingUp className="w-3.5 h-3.5 text-[#00F0FF]" />
            <select
              value={trend.id}
              onChange={(e) => {
                const f = TREND_MODES.find((t) => t.id === e.target.value);
                if (f) onTrend(f);
              }}
              className="bg-transparent text-xs text-[#F0F6FC] focus:outline-none cursor-pointer"
            >
              {TREND_MODES.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#0E1522]">
                  ট্রেন্ড: {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center bg-[#070B12] p-0.5 rounded border border-[#1C293D]">
            {[
              { ms: 200, l: 'দ্রুত' },
              { ms: 500, l: 'মাঝারি' },
              { ms: 1200, l: 'ধীর' },
            ].map((o) => (
              <button
                key={o.ms}
                onClick={() => onInterval(o.ms)}
                className={`px-2 py-0.5 text-[11px] rounded ${
                  intervalMs === o.ms ? 'bg-[#1C293D] text-[#00F0FF] font-semibold' : 'text-[#8B9EB7] hover:text-[#F0F6FC]'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleStream}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              isStreaming
                ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40'
                : 'bg-[#00F0FF] text-[#070B12] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
            }`}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isStreaming ? 'বিরতি' : 'সংগ্রহ চালু'}
          </button>
          <button
            onClick={onCollectOne}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-[#070B12] hover:bg-[#1C293D] border border-[#1C293D] text-[#F0F6FC]"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#00F0FF]" />
            +১ পোস্ট
          </button>
          <button
            onClick={onCollectBurst}
            className="hidden sm:block px-2.5 py-1.5 rounded text-xs bg-[#070B12] hover:bg-[#1C293D] border border-[#1C293D] text-[#00F0FF]"
          >
            +২৫ ব্যাচ
          </button>
          <button
            onClick={onReset}
            title="সব ডেটা শূন্য করুন"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-[#070B12] hover:bg-[#1C293D] border border-[#1C293D] text-[#8B9EB7]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">রিসেট</span>
          </button>
          <button
            onClick={onExport}
            title="রেকর্ড CSV ডাউনলোড"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-[#070B12] hover:bg-[#1C293D] border border-[#1C293D] text-[#8B9EB7] hover:text-[#00F0FF]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">CSV</span>
          </button>
        </div>
      </div>

      <nav className="px-3 flex gap-1 overflow-x-auto border-t border-[#1C293D]/60">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#00F0FF] text-[#00F0FF]'
                : 'border-transparent text-[#8B9EB7] hover:text-[#F0F6FC]'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span
                className={`px-1.5 rounded-full text-[10px] font-semibold ${
                  t.id === 'moderation' ? 'bg-[#F43F5E]/20 text-[#F43F5E]' : 'bg-[#1C293D] text-[#F0F6FC]'
                }`}
              >
                {bnNum(t.badge)}
              </span>
            )}
          </button>
        ))}
      </nav>
    </header>
  );
};

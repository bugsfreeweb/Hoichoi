"use client";

import Link from "next/link";
import clsx from "clsx";
import { Activity, AlertTriangle, Radio, ShieldCheck } from "lucide-react";
import { Badge, LiveDot } from "@/components/mv/ui/primitives";
import { Marquee, LiveClock } from "@/components/mv/ui/motion";
import { useMvData } from "@/components/mv/ui/mv-data";
import { bn } from "@/lib/mv/format";

const toneColor: Record<string, string> = {
  hot: "#ff5c38",
  ok: "#4ade80",
  warn: "#f5a524",
  cool: "#56c8ff",
};

export default function Ticker({ variant }: { variant: string }) {
  if (variant === "pulse") return <PulseStrip />;
  if (variant === "datafeed") return <DatafeedStrip />;
  if (variant === "bulletin") return <BulletinBar />;
  if (variant === "notice") return <NoticeBar />;
  return <BreakingMarquee />;
}

/* ── variant 1: breaking marquee ───────────────────────────── */
function BreakingMarquee() {
  const { tickerItems: TICKER_ITEMS } = useMvData();
  return (
    <div className="relative z-50 border-b border-white/8 bg-ink-950/90 backdrop-blur">
      <div className="flex items-stretch">
        <div className="flex shrink-0 items-center gap-2 px-4 py-2" style={{ background: "var(--accent)" }}>
          <AlertTriangle className="h-3.5 w-3.5 text-ink-950" />
          <span className="mono-label font-bold text-ink-950">জরুরি আপডেট</span>
        </div>
        <div className="mask-fade-r relative flex-1 overflow-hidden py-2">
          <Marquee speed="normal">
            {TICKER_ITEMS.map((t, i) => (
              <span key={i} className="flex items-center gap-2.5 whitespace-nowrap px-6">
                <span className="mono-label" style={{ color: toneColor[t.tone] }}>
                  {t.flag}
                </span>
                <span className="h-1 w-1 rounded-full" style={{ background: toneColor[t.tone] }} />
                <span className="text-[13px] text-mist-300">{t.text}</span>
              </span>
            ))}
          </Marquee>
        </div>
        <div className="hidden shrink-0 items-center gap-3 border-l border-white/8 px-4 md:flex">
          <LiveDot />
          <LiveClock className="mono-label text-mist-300" />
        </div>
      </div>
    </div>
  );
}

/* ── variant 2: pulse strip ───────────────────────────── */
function PulseStrip() {
  const { pipelineGauges: PIPELINE_GAUGES } = useMvData();
  return (
    <div className="relative z-50 border-b border-white/8 bg-ink-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 overflow-x-auto px-5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
          <LiveDot />
          <span className="mono-label text-mist-200">সব সিস্টেম সক্রিয়</span>
        </span>
        {PIPELINE_GAUGES.map((g) => (
          <span key={g.label} className="flex shrink-0 items-center gap-2 rounded-full border border-white/8 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />
            <span className="mono-label text-mist-400">{g.label}</span>
            <span className="font-latin text-[11px] font-semibold text-mist-100">{bn(g.value)}%</span>
          </span>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
          <LiveClock className="mono-label text-mist-300" />
        </span>
      </div>
    </div>
  );
}

/* ── variant 3: datafeed minimal ───────────────────────────── */
function DatafeedStrip() {
  const { tickerItems: TICKER_ITEMS } = useMvData();
  return (
    <div className="relative z-50 overflow-hidden border-b border-white/8 bg-ink-950">
      <div className="mask-fade-r">
        <Marquee speed="fast">
          {Array.from({ length: 3 }).map((_, k) => (
            <span key={k} className="flex items-center gap-5 whitespace-nowrap px-5 py-1.5">
              {[
                { icon: Radio, t: "FEED · 10 SOURCES" },
                { icon: ShieldCheck, t: "FACT-GATE 0.90" },
                { icon: Activity, t: "ISR ~8s" },
              ].map(({ icon: Icon, t }, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-mist-400" />
                  <span className="mono-label text-mist-400">{t}</span>
                </span>
              ))}
              <span className="mono-label text-mist-400/60">
                {TICKER_ITEMS.map((x) => x.flag).join(" / ")}
              </span>
              <Badge tone="ok" className="border-transparent bg-transparent px-0">
                <LiveDot />
              </Badge>
            </span>
          ))}
        </Marquee>
      </div>
      <div className="flex items-center justify-between border-t border-white/6 px-5 py-1">
        <Link href="/admin" className={clsx("mono-label text-mist-400 transition-colors hover:text-mist-100")}>
          সম্পাদকীয় ডেস্ক ↗
        </Link>
        <LiveClock className="mono-label text-mist-400" />
      </div>
    </div>
  );
}

/* ── variant 4: news bulletin ───────────────────────────── */
function BulletinBar() {
  const { tickerItems: TICKER_ITEMS } = useMvData();
  return (
    <div className="relative z-50 border-b border-white/8 bg-ink-950 py-2 px-5">
      <div className="mx-auto max-w-[1600px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge tone="hot">
            <LiveDot tone="hot" /> বুলেটিন
          </Badge>
          <span className="font-display-bn text-[14px] text-mist-100 truncate max-w-2xl">
            {TICKER_ITEMS[0]?.text}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="mono-label text-mist-400">প্রতি ২ ঘণ্টায় স্বয়ংক্রিয় সিঙ্ক</span>
          <LiveClock className="mono-label text-mist-300" />
        </div>
      </div>
    </div>
  );
}

/* ── variant 5: clean notice ───────────────────────────── */
function NoticeBar() {
  return (
    <div className="relative z-50 border-b border-white/8 bg-ink-900/90 py-1.5 px-4 text-center">
      <p className="text-[13px] text-mist-300 inline-flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
        <span>হৈচৈ লাইভ ফ্যাক্ট-চেক ফিড · সব তথ্য উৎস যাচাইকৃত ও সংগৃহীত</span>
      </p>
    </div>
  );
}

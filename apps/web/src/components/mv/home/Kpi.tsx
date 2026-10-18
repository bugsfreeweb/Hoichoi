"use client";

import { ArrowDownRight, ArrowUpRight, FileCheck2, Layers, MessageSquareQuote, ShieldAlert } from "lucide-react";
import { Badge, LiveDot, SectionShell, Sparkline } from "@/components/mv/ui/primitives";
import { CountUp, Reveal } from "@/components/mv/ui/motion";
import { RadialGauges } from "@/components/mv/charts";
import { useMvData } from "@/components/mv/ui/mv-data";
import type { SyncPoint } from "@/lib/mv/data";
import { bn } from "@/lib/mv/format";

export interface Totals {
  collected: number;
  published: number;
  dupes: number;
  comments: number;
}

const CARDS = [
  {
    key: "collected" as const,
    label: "সংগৃহীত প্রতিবেদন",
    en: "COLLECTED",
    note: "নির্বাচিত সময়ের নতুন রেকর্ড",
    color: "#ff5c38",
    Icon: Layers,
    delta: "+১২.৪%",
    up: true,
  },
  {
    key: "published" as const,
    label: "প্রকাশিত প্রতিবেদন",
    en: "PUBLISHED",
    note: "পাবলিক সাইটে প্রকাশিত",
    color: "#f5a524",
    Icon: FileCheck2,
    delta: "+৮.১%",
    up: true,
  },
  {
    key: "dupes" as const,
    label: "ডুপ্লিকেট চিহ্নিত",
    en: "DUPLICATES",
    note: "পুনরাবৃত্তি হিসেবে সংরক্ষিত",
    color: "#56c8ff",
    Icon: ShieldAlert,
    delta: "−৩.২%",
    up: false,
  },
  {
    key: "comments" as const,
    label: "অনুমোদিত মন্তব্য",
    en: "COMMENTS",
    note: "সম্পাদকীয় রিভিউ পেরিয়েছে",
    color: "#4ade80",
    Icon: MessageSquareQuote,
    delta: "+৫.৭%",
    up: true,
  },
];

export default function Kpi({
  variant,
  totals,
  density,
}: {
  variant: string;
  totals: Totals;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "glass") return <GlassMetrics totals={totals} density={density} />;
  if (variant === "ledger") return <LedgerRow totals={totals} density={density} />;
  if (variant === "strip") return <StripRow totals={totals} density={density} />;
  if (variant === "rings") return <RingsMetrics totals={totals} density={density} />;
  return <CounterCards totals={totals} density={density} />;
}

function spark(series: SyncPoint[], key: keyof Totals, n = 14) {
  return series.slice(-n).map((s) => s[key]);
}

/* ── variant 1 · counter cards ───────────────────────────── */
function CounterCards({ totals, density }: { totals: Totals; density: "compact" | "comfortable" | "spacious" }) {
  const { syncSeries } = useMvData();
  return (
    <SectionShell density={density} className={density === "spacious" ? "" : "!py-10 md:!py-14"}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c, i) => (
          <Reveal key={c.key} delay={i * 0.08}>
            <div className="surface card-lift group relative h-full overflow-hidden rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl transition-transform duration-500 group-hover:scale-110" style={{ background: `${c.color}1f`, color: c.color }}>
                  <c.Icon className="h-4.5 w-4.5" />
                </span>
                <Badge tone={c.up ? "ok" : "cool"} className="border-transparent">
                  {c.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {c.delta}
                </Badge>
              </div>
              <p className="font-latin mt-5 text-[clamp(2.2rem,4vw,3rem)] font-bold leading-none text-mist-100">
                <CountUp value={totals[c.key]} />
              </p>
              <p className="mt-2.5 text-[14.5px] font-semibold text-mist-200">{c.label}</p>
              <p className="mt-1 text-[12.5px] text-mist-400">{c.note}</p>
              <div className="mt-4 h-10 opacity-80 transition-opacity duration-500 group-hover:opacity-100">
                <Sparkline data={spark(syncSeries, c.key)} color={c.color} className="h-10 w-full" height={40} width={220} />
              </div>
              <span className="mono-label absolute bottom-4 right-5 text-mist-400/40">{c.en}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── variant 2 · glass metrics ───────────────────────────── */
function GlassMetrics({ totals, density }: { totals: Totals; density: "compact" | "comfortable" | "spacious" }) {
  const gauges = [
    { label: "সংগৃহীত", value: Math.min(100, Math.round((totals.collected / 460) * 100)), color: "#ff5c38", sub: `${bn(totals.collected)} রেকর্ড` },
    { label: "প্রকাশিত", value: Math.min(100, Math.round((totals.published / 220) * 100)), color: "#f5a524", sub: `${bn(totals.published)} টি` },
    { label: "ডুপ্লিকেট", value: Math.min(100, Math.round((totals.dupes / 140) * 100)), color: "#56c8ff", sub: `${bn(totals.dupes)} টি` },
    { label: "মন্তব্য", value: Math.min(100, Math.round((totals.comments / 90) * 100)), color: "#4ade80", sub: `${bn(totals.comments)} টি` },
  ];
  return (
    <SectionShell density={density} className="!py-10 md:!py-14">
      <div className="surface-hi relative overflow-hidden rounded-3xl p-6 md:p-9">
        <div aria-hidden className="dot-bg pointer-events-none absolute inset-0 opacity-30 mask-fade-b" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="lg:w-[34%]">
            <span className="mono-label flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <LiveDot tone="hot" /> LIVE METRICS
            </span>
            <h3 className="font-display-bn mt-3 text-3xl leading-tight text-mist-100">
              ডাটাবেসে এখন যা জমেছে
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-mist-400">
              প্রতি ১০ সেকেন্ডে নতুন তথ্য। গ্রাফে ডাটাবেসের রেকর্ড গণনা করা হয়; নমুনা রেকর্ড থাকলে সেটিও অন্তর্ভুক্ত।
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {gauges.map((g) => (
                <div key={g.label} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                  <p className="mono-label text-mist-400">{g.label}</p>
                  <p className="font-latin mt-1 text-lg font-bold" style={{ color: g.color }}>
                    <CountUp value={totals[g.label === "সংগৃহীত" ? "collected" : g.label === "প্রকাশিত" ? "published" : g.label === "ডুপ্লিকেট" ? "dupes" : "comments"]} />
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <RadialGauges data={gauges} height={300} />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ── variant 3 · ledger row ───────────────────────────── */
function LedgerRow({ totals, density }: { totals: Totals; density: "compact" | "comfortable" | "spacious" }) {
  const { syncSeries } = useMvData();
  return (
    <SectionShell density={density} className="!py-10 md:!py-14">
      <div className="overflow-hidden rounded-2xl border border-white/8">
        <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.02] px-5 py-3">
          <span className="mono-label text-mist-300">LEDGER · {bn(new Date().getFullYear())}</span>
          <span className="mono-label flex items-center gap-2 text-mist-400">
            <LiveDot /> SYNCED EVERY 10S
          </span>
        </div>
        <div className="divide-y divide-white/6 bg-ink-900/40">
          {CARDS.map((c) => (
            <div key={c.key} className="group grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] md:grid-cols-[auto_1.4fr_1fr_auto_auto] md:gap-6">
              <span className="hidden h-8 w-8 place-items-center rounded-md md:grid" style={{ background: `${c.color}18`, color: c.color }}>
                <c.Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[14.5px] font-semibold text-mist-100">{c.label}</p>
                <p className="mono-label mt-0.5 text-mist-400">{c.en}</p>
              </div>
              <p className="hidden text-[12.5px] text-mist-400 md:block">{c.note}</p>
              <div className="hidden h-8 w-28 md:block">
                <Sparkline data={spark(syncSeries, c.key, 10)} color={c.color} className="h-8 w-28" height={32} width={112} fill={false} />
              </div>
              <div className="flex items-center gap-4">
                <span className="font-latin text-2xl font-bold tabular-nums" style={{ color: c.color }}>
                  <CountUp value={totals[c.key]} />
                </span>
                <span className={c.up ? "mono-label text-mint-400" : "mono-label text-azure-400"}>{c.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/* ── variant 4 · full width strip ───────────────────────────── */
function StripRow({ totals, density }: { totals: Totals; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density} className="!py-6">
      <div className="surface grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.key} className="bg-ink-950 p-5 flex items-center justify-between">
            <div>
              <p className="text-[13.5px] text-mist-400">{c.label}</p>
              <p className="font-latin mt-1 text-2xl font-bold text-mist-100" style={{ color: c.color }}>
                <CountUp value={totals[c.key]} />
              </p>
            </div>
            <div className="text-right">
              <span className={c.up ? "mono-label text-mint-400" : "mono-label text-azure-400"}>{c.delta}</span>
              <p className="mono-label mt-1 text-mist-400/60">১০ সে. সিঙ্ক</p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── variant 5 · colorful progress rings ───────────────────────────── */
function RingsMetrics({ totals, density }: { totals: Totals; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density} className="!py-10 md:!py-14">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.key} className="surface-hi card-lift relative rounded-2xl p-6 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `${c.color}1f`, color: c.color }}>
              <c.Icon className="h-6 w-6" />
            </div>
            <p className="font-latin text-3xl font-bold" style={{ color: c.color }}>
              <CountUp value={totals[c.key]} />
            </p>
            <p className="mt-2 text-[14px] font-semibold text-mist-100">{c.label}</p>
            <p className="mt-1 text-[12px] text-mist-400">{c.note}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

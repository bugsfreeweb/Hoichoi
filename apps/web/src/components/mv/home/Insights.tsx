"use client";

import { useState } from "react";
import clsx from "clsx";
import { BarChart3, LineChart as LineIcon, MousePointer2, PieChart as PieIcon, Radar as RadarIcon, Trees } from "lucide-react";
import { Badge, Btn, Funnel, LiveDot, SectionHead, SectionShell } from "@/components/mv/ui/primitives";
import { Reveal } from "@/components/mv/ui/motion";
import { CountUp } from "@/components/mv/ui/motion";
import {
  CategoryBarChart,
  ChartCard,
  ComposedInsightChart,
  DonutChart,
  FactRadarChart,
  RadialGauges,
  RetentionBar,
  SyncAreaChart,
  TopicTreemap,
} from "@/components/mv/charts";
import { useMvData } from "@/components/mv/ui/mv-data";
import { bn } from "@/lib/mv/format";

import ObsidianGraph from "@/components/mv/charts/ObsidianGraph";

export default function Insights({
  variant,
  density,
}: {
  variant: string;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "area") return <AreaVariant density={density} />;
  if (variant === "gauges") return <GaugesVariant density={density} />;
  if (variant === "treemap") return <TreemapVariant density={density} />;
  if (variant === "matrix") return <ObsidianGraphVariant density={density} />;
  return <DashboardVariant density={density} />;
}

const RANGES = [
  { id: 7, label: "৭ দিন" },
  { id: 14, label: "১৪ দিন" },
  { id: 30, label: "৩০ দিন" },
];

/** Average newly-collected records per day across the last 14 days. */
function avgDaily(series: { collected: number }[]) {
  return Math.max(
    1,
    Math.round(
      ((series[series.length - 1]?.collected ?? 0) - (series[series.length - 15]?.collected ?? 0)) / 14,
    ),
  );
}

/* ── variant 1 · mixed dashboard ───────────────────────────── */
function DashboardVariant({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const { syncSeries: SYNC_SERIES, categoryMix: CATEGORY_MIX, factRadar: FACT_RADAR, pipelineGauges: PIPELINE_GAUGES } = useMvData();
  const [range, setRange] = useState(30);
  const data = SYNC_SERIES.slice(-range);
  const AVG_DAILY = avgDaily(SYNC_SERIES);
  return (
    <SectionShell id="live-insights" density={density}>
      <SectionHead
        kicker="▚ LIVE INSIGHTS · TURSO DATABASE"
        title={<>ডাটাবেসে যা জমেছে, <span className="text-gradient">গ্রাফে তার হিসাব</span></>}
        desc="গ্রাফে মাউস রাখুন বা Tab চাপুন — প্রতিটি সময়ের সংখ্যা দেখা যাবে। প্রতি ১০ সেকেন্ডে নতুন তথ্য।"
        right={
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={clsx(
                  "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-300",
                  range === r.id ? "text-ink-950" : "text-mist-400 hover:text-mist-100",
                )}
                style={range === r.id ? { background: "var(--accent)" } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <ChartCard
            title="সংগ্রহ বনাম প্রকাশ"
            sub={`শেষ ${bn(range)} দিনের রেকর্ড ট্রেন্ড`}
            height={300}
            right={
              <Badge tone="ok">
                <LiveDot /> AUTO REFRESH 10S
              </Badge>
            }
          >
            <ComposedInsightChart data={data} height={300} />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.08}>
          <ChartCard title="ক্যাটাগরি মিক্স" sub="বিষয়ভিত্তিক রেকর্ড বণ্টন" height={300}>
            <DonutChart data={CATEGORY_MIX} height={300} />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.14} className="lg:col-span-2">
          <ChartCard title="ফ্যাক্ট-গেট তুলনা" sub="কাঁচা ফিড বনাম পুনর্লিখিত প্রতিবেদনের স্কোর" height={280}>
            <FactRadarChart data={FACT_RADAR} height={280} />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.2}>
          <ChartCard title="টপ ক্যাটাগরি" sub="প্রতিবেদন সংখ্যা অনুযায়ী" height={280}>
            <CategoryBarChart data={CATEGORY_MIX} height={280} horizontal />
          </ChartCard>
        </Reveal>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { Icon: BarChart3, k: "মোট রেকর্ড", v: SYNC_SERIES[SYNC_SERIES.length - 1]?.collected ?? 0 },
          { Icon: LineIcon, k: "গড় দৈনিক সংগ্রহ", v: AVG_DAILY },
          { Icon: PieIcon, k: "প্রকাশের হার", v: 21 },
          { Icon: RadarIcon, k: "গড় ফ্যাক্ট স্কোর", v: 88 },
        ].map((m, i) => (
          <Reveal key={m.k} delay={i * 0.06}>
            <div className="surface card-lift flex items-center gap-4 rounded-xl p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <m.Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-latin text-xl font-bold text-mist-100">
                  <CountUp value={m.v} suffix={m.k.includes("হার") || m.k.includes("স্কোর") ? "%" : ""} />
                </p>
                <p className="mono-label mt-0.5 text-mist-400">{m.k}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── variant 2 · stacked area only ───────────────────────────── */
function AreaVariant({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const { syncSeries: SYNC_SERIES } = useMvData();
  const [range, setRange] = useState(30);
  const [mode, setMode] = useState<"stacked" | "smooth" | "stepped">("smooth");
  const data = SYNC_SERIES.slice(-range);
  return (
    <SectionShell id="live-insights" density={density}>
      <SectionHead
        kicker="▚ ONE CHART · ALL SIGNAL"
        title={<>সংগৃহীত বনাম প্রকাশিত — <span className="text-gradient">এক নজরে</span></>}
        desc="একটাই বড় গ্র্যাডিয়েন্ট এরিয়া চার্ট। সময়ের পরিসর আর রেখার ধরন নিজেই বদলে দেখুন।"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={clsx("rounded-full px-3 py-1.5 text-[12px] font-medium transition-all", range === r.id ? "text-ink-950" : "text-mist-400 hover:text-mist-100")}
                  style={range === r.id ? { background: "var(--accent)" } : undefined}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
              {(["smooth", "stacked", "stepped"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={clsx("mono-label rounded-full px-3 py-1.5 transition-all", mode === m ? "text-ink-950" : "text-mist-400 hover:text-mist-100")}
                  style={mode === m ? { background: "#f5a524" } : undefined}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        }
      />
      <Reveal>
        <div className="surface-hi relative overflow-hidden rounded-3xl p-5 md:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {[
              { c: "#ff5c38", k: "সংগৃহীত" },
              { c: "#f5a524", k: "প্রকাশিত" },
              { c: "#56c8ff", k: "ডুপ্লিকেট" },
            ].map((l) => (
              <span key={l.k} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.c }} />
                <span className="text-[13px] text-mist-300">{l.k}</span>
              </span>
            ))}
            <span className="mono-label ml-auto flex items-center gap-2 text-mist-400">
              <MousePointer2 className="h-3.5 w-3.5" /> HOVER / TAB FOR VALUES
            </span>
          </div>
          <SyncAreaChart data={data} variant={mode} height={420} />
          <div className="mt-6 grid gap-4 border-t border-white/8 pt-6 sm:grid-cols-3">
            {[
              { k: "মোট সংগৃহীত", v: data[data.length - 1]?.collected ?? 0, c: "#ff5c38" },
              { k: "মোট প্রকাশিত", v: data[data.length - 1]?.published ?? 0, c: "#f5a524" },
              { k: "ডুপ্লিকেট ব্লক", v: data[data.length - 1]?.dupes ?? 0, c: "#56c8ff" },
            ].map((s) => (
              <div key={s.k}>
                <p className="mono-label text-mist-400">{s.k}</p>
                <p className="font-latin mt-1 text-3xl font-bold" style={{ color: s.c }}>
                  <CountUp value={s.v} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 3 · radial gauges ───────────────────────────── */
function GaugesVariant({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const { pipelineGauges: PIPELINE_GAUGES, services: SERVICES, retention: RETENTION } = useMvData();
  return (
    <SectionShell id="live-insights" density={density}>
      <SectionHead
        kicker="▚ PIPELINE HEALTH GAUGES"
        title={<>পাইপলাইনের <span className="text-gradient">স্বাস্থ্য পরিমাপ</span></>}
        desc="চারটি গজ আর প্রতিটি সার্ভিসের লেটেন্সি — সব এক প্যানেলে।"
        right={<Btn href="/admin" variant="outline">কনফিগারেশন</Btn>}
      />
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <ChartCard title="মূল সূচক" sub="শেষ ৩০ দিনের গড়" height={320}>
            <RadialGauges data={PIPELINE_GAUGES} height={320} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="surface h-full rounded-2xl p-5 md:p-7">
            <p className="mono-label mb-5 text-mist-400">SERVICE LATENCY · ms</p>
            <div className="space-y-4">
              {SERVICES.map((s) => {
                const pct = Math.min(100, (s.latency / 9000) * 100);
                const color = s.status === "operational" ? "#4ade80" : s.status === "degraded" ? "#f5a524" : "#56c8ff";
                return (
                  <div key={s.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] text-mist-200">{s.name}</span>
                      <span className="font-latin text-[12px] font-semibold text-mist-300">{bn(s.latency)} ms</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(6, pct)}%`, background: color }} />
                    </div>
                    <p className="mono-label mt-1.5 text-mist-400/70">{s.note}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.16} className="lg:col-span-2">
          <ChartCard title="পাঠক ধরে রাখার হার" sub="পেজ খোলার পর কতক্ষণ থাকে" height={230}>
            <RetentionBar data={RETENTION} height={230} />
          </ChartCard>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ── variant 4 · treemap + funnel ───────────────────────────── */
function TreemapVariant({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  const { treemapTopics: TREEMAP_TOPICS, funnelStages: FUNNEL_STAGES } = useMvData();
  return (
    <SectionShell id="live-insights" density={density}>
      <SectionHead
        kicker="▚ TOPIC MAP × CONVERSION"
        title={<>কোন বিষয়ে কত খবর, <span className="text-gradient">আর কতটুকু প্রকাশিত</span></>}
        desc="ট্রিম্যাপের প্রতিটি ঘর একটি উপ-বিষয়; রঙের গাঢ়তা বলে দেয় কোনটি কোন ক্যাটাগরির।"
        right={
          <span className="mono-label flex items-center gap-2 text-mist-400">
            <Trees className="h-3.5 w-3.5" /> {bn(TREEMAP_TOPICS.length)} নোড
          </span>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Reveal>
          <ChartCard title="বিষয়ভিত্তিক ট্রিম্যাপ" sub="যাচাইকৃত বনাম অপেক্ষমাণ" height={340}>
            <TopicTreemap data={TREEMAP_TOPICS} height={340} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="surface h-full rounded-2xl p-5 md:p-6">
            <p className="mono-label mb-4 text-mist-400">কনভার্সন ফানেল</p>
            <Funnel stages={FUNNEL_STAGES} />
            <p className="mt-5 border-t border-white/8 pt-4 text-[12.5px] leading-relaxed text-mist-400">
              ফানেলের প্রতিটি ধাপ আলাদা লগ রাখে। কোনো ধাপ ব্যর্থ হলে রেকর্ড পরের ধাপে যায় না — সেটি রিট্রাই কিউ-তে
              ফিরে যায়।
            </p>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ── variant 5 · Obsidian interactive knowledge graph matrix ────────── */
function ObsidianGraphVariant({ density }: { density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="live-insights" density={density}>
      <SectionHead
        kicker="▚ OBSIDIAN NEURAL MATRIX"
        title={<>ইন্টারেক্টিভ <span className="text-gradient">নলেজ গ্রাফ</span></>}
        desc="অবসিডিয়ান-ধাঁচের ইন্টারঅ্যাক্টিভ নোড নেটওয়ার্ক। নোড টেনে দেখুন, ক্লিক করে সংযুক্ত খবর, বিভাগ ও ফ্যাক্ট-স্কোর পরীক্ষা করুন।"
      />
      <Reveal>
        <ObsidianGraph height={540} />
      </Reveal>
    </SectionShell>
  );
}

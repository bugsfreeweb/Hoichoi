/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowDown, CircleDot, Cpu, Database, Radio, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import { Badge, Btn, LiveDot, SectionShell } from "@/components/mv/ui/primitives";
import { CountUp, LiveClock, Magnetic, Marquee, Scramble, SparklineWrap, TypeWriter } from "./hero-bits";
import { HOME_META } from "@/lib/mv/content";
import { useMvData } from "@/components/mv/ui/mv-data";
import type { SyncPoint } from "@/lib/mv/data";
import { bn, bnCompact } from "@/lib/mv/format";

export interface HeroProps {
  variant: string;
  density: "compact" | "comfortable" | "spacious";
  totals: { collected: number; published: number; dupes: number; comments: number };
}

export default function Hero({ variant, density, totals }: HeroProps) {
  if (variant === "cinema") return <CinemaHero totals={totals} />;
  if (variant === "bento") return <BentoHero totals={totals} density={density} />;
  if (variant === "terminal") return <TerminalHero totals={totals} />;
  if (variant === "center") return <CenterHero totals={totals} density={density} />;
  return <SplitHero totals={totals} density={density} />;
}

function getSparks(series: SyncPoint[]) {
  const last = series.slice(-14);
  return {
    spark: last.map((s) => s.collected),
    sparkPub: last.map((s) => s.published),
  };
}

function ChainStrip() {
  return (
    <div className="mask-fade-r overflow-hidden border-y border-white/8 py-2.5">
      <Marquee speed="slow">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="mono-label flex items-center gap-3 whitespace-nowrap px-4 text-mist-400">
            {HOME_META.pipelineChain}
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
            প্রতি ২ ঘণ্টায় অটোমেটেড রান
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
          </span>
        ))}
      </Marquee>
    </div>
  );
}

/* ───────────────── variant 1 · split live ───────────────── */
function SplitHero({ totals, density }: { totals: HeroProps["totals"]; density: HeroProps["density"] }) {
  const { syncSeries: SYNC_SERIES } = useMvData();
  const { spark, sparkPub } = getSparks(SYNC_SERIES);
  return (
    <SectionShell density={density} className="pt-10 md:pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge tone="hot">
              <LiveDot tone="hot" /> HOICHOI NEWSROOM
            </Badge>
            <Badge tone="mute">HOICHOI DATABASE</Badge>
            <Badge tone="ok">HUMAN REVIEW</Badge>
          </div>
          <h1 className="font-display-bn text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] text-mist-100">
            <Scramble text="হৈচৈ!" />
          </h1>
          <p className="mt-5 max-w-xl font-display-bn text-[clamp(1.25rem,2.6vw,1.9rem)] leading-snug text-mist-200">
            {HOME_META.tagline} — <span className="text-gradient">শহর ফিডে যা বলে, আমরা তা যাচাই করে লিখি।</span>
          </p>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mist-400">{HOME_META.intro}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Btn href="#latest">সর্বশেষ সংগ্রহ পড়ুন</Btn>
            </Magnetic>
            <Btn href="/admin" variant="outline">
              অ্যাডমিন প্যানেল
            </Btn>
            <Btn href="#live-insights" variant="ghost" icon={false}>
              <ArrowDown className="h-4 w-4" /> লাইভ গ্রাফ
            </Btn>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8 sm:grid-cols-4">
            {[
              { k: "সংগৃহীত রেকর্ড", v: totals.collected, tone: "#ff5c38" },
              { k: "প্রকাশিত", v: totals.published, tone: "#f5a524" },
              { k: "ডুপ্লিকেট", v: totals.dupes, tone: "#56c8ff" },
              { k: "অনুমোদিত মন্তব্য", v: totals.comments, tone: "#4ade80" },
            ].map((s) => (
              <div key={s.k} className="bg-ink-900 p-4">
                <p className="font-latin text-2xl font-bold leading-none" style={{ color: s.tone }}>
                  <CountUp value={s.v} />
                </p>
                <p className="mt-1.5 text-[12px] text-mist-400">{s.k}</p>
              </div>
            ))}
          </div>
        </div>

        {/* live sync card */}
        <div className="relative">
          <div aria-hidden className="absolute -inset-6 rounded-[2rem] opacity-40 blur-3xl" style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }} />
          <div className="surface-hi relative overflow-hidden rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <span className="mono-label flex items-center gap-2 text-mist-300">
                <LiveDot /> লাইভ সিঙ্ক
              </span>
              <LiveClock className="mono-label text-mist-400" />
            </div>
            <p className="mt-4 font-display-bn text-2xl text-mist-100">সর্বশেষ তথ্য</p>
            <p className="mt-1 text-[13px] text-mist-400">
              সর্বশেষ নথিভুক্ত রান · <span className="text-mist-200">{bn(11)}:{bn(58)} AM</span>
            </p>

            <div className="mt-6 space-y-4">
              <SparklineWrap label="সংগৃহীত" data={spark} color="#ff5c38" value={totals.collected} />
              <SparklineWrap label="প্রকাশিত" data={sparkPub} color="#f5a524" value={totals.published} />
            </div>

            <div className="mt-6 space-y-2 border-t border-white/8 pt-5">
              {[
                { Icon: Database, k: "TURSO ডাটাবেস", v: "সংযুক্ত", tone: "ok" as const },
                { Icon: Radio, k: "পাবলিক ডেটা API", v: "GET /api/stats · 10s", tone: "ok" as const },
                { Icon: Cpu, k: "ডেস্কটপ কালেক্টর", v: "heartbeat সক্রিয়", tone: "warn" as const },
              ].map(({ Icon, k, v, tone }) => (
                <div key={k} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-mist-400" />
                  <span className="text-[13px] text-mist-300">{k}</span>
                  <span className="ml-auto">
                    <Badge tone={tone}>{v}</Badge>
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="#live-insights"
              className="mt-6 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-[13.5px] font-medium text-mist-100 transition-all hover:border-white/25 hover:bg-white/[0.04]"
            >
              লাইভ গ্রাফ দেখুন
              <ArrowDown className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-16">
        <ChainStrip />
      </div>
    </SectionShell>
  );
}

/* ───────────────── variant 2 · cinematic ───────────────── */
function CinemaHero({ totals }: { totals: HeroProps["totals"] }) {
  return (
    <section className="relative min-h-[92vh] overflow-hidden">
      <img
        src="/images/hero-city.jpg"
        alt="শহরের রাতের দৃশ্য"
        className="ken-burns absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/55 to-ink-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/40 to-transparent" />
      <div aria-hidden className="scan-line absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" />

      <div className="relative mx-auto flex min-h-[92vh] max-w-[1600px] flex-col justify-end px-5 pb-14 pt-32 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge tone="hot">
            <LiveDot tone="hot" /> LIVE NEWSROOM
          </Badge>
          <Badge tone="mute">{HOME_META.pipelineChain}</Badge>
          <Badge tone="ok">
            <ShieldCheck className="h-3 w-3" /> FACT-GATE 0.90
          </Badge>
        </div>

        <h1 className="font-display-bn max-w-5xl text-[clamp(2.6rem,7.6vw,6rem)] leading-[1.02] text-mist-100">
          শহরের <span className="text-gradient">হৈচৈ</span>,
          <br />
          সংবাদের ভাষায়।
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-mist-300 md:text-[17px]">
          ফিড থেকে সংগ্রহ, হ্যাশ-ডুপ্লিকেট গেট, ফ্যাক্ট-গেট পুনর্লিখন আর মানুষের রিভিউ — ছয় ধাপ পেরিয়ে খবর পৌঁছায়
          আপনার স্ক্রিনে। প্রতি ২ ঘণ্টায় স্বয়ংক্রিয় রান।
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Magnetic>
            <Btn href="#latest">সর্বশেষ পড়ুন</Btn>
          </Magnetic>
          <Btn href="#live-insights" variant="outline">
            ডেটা দেখুন
          </Btn>
          <Btn href="/admin" variant="ghost" icon={false}>
            <Sparkles className="h-4 w-4" /> ডেস্ক লঞ্চ
          </Btn>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "সংগৃহীত রেকর্ড", v: totals.collected, sub: "নির্বাচিত সময়ের নতুন রেকর্ড", tone: "#ff5c38" },
            { k: "প্রকাশিত প্রতিবেদন", v: totals.published, sub: "পাবলিক সাইটে প্রকাশিত", tone: "#f5a524" },
            { k: "ডুপ্লিকেট চিহ্নিত", v: totals.dupes, sub: "পুনরাবৃত্তি হিসেবে সংরক্ষিত", tone: "#56c8ff" },
            { k: "অনুমোদিত মন্তব্য", v: totals.comments, sub: "সম্পাদকীয় রিভিউ পেরিয়েছে", tone: "#4ade80" },
          ].map((s) => (
            <div key={s.k} className="group bg-ink-950/85 p-5 backdrop-blur transition-colors hover:bg-ink-900/85">
              <p className="font-latin text-4xl font-bold leading-none" style={{ color: s.tone }}>
                <CountUp value={s.v} />
              </p>
              <p className="mt-2.5 text-[14px] font-semibold text-mist-100">{s.k}</p>
              <p className="mt-1 text-[12px] text-mist-400">{s.sub}</p>
              <div className="mt-3 h-px w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: s.tone }} />
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-3 text-mist-400">
          <span className="relative flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1">
            <span className="h-2 w-1 animate-bounce rounded-full" style={{ background: "var(--accent)" }} />
          </span>
          <span className="mono-label">SCROLL · নিচে নামুন</span>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── variant 3 · editorial bento ───────────────── */
function BentoHero({ totals, density }: { totals: HeroProps["totals"]; density: HeroProps["density"] }) {
  const { syncSeries: SYNC_SERIES, pipelineGauges: PIPELINE_GAUGES, pipelineSteps: PIPELINE_STEPS } = useMvData();
  const { spark, sparkPub } = getSparks(SYNC_SERIES);
  return (
    <SectionShell density={density} className="pt-8">
      <div className="grid auto-rows-[minmax(0,auto)] gap-4 lg:grid-cols-4">
        <div className="surface-hi relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl p-7 lg:col-span-2 lg:row-span-2">
          <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative">
            <Badge tone="hot">
              <LiveDot tone="hot" /> এই সিঙ্কের প্রধান কনটেন্ট
            </Badge>
            <h1 className="font-display-bn mt-6 text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[1.05] text-mist-100">
              <Scramble text="হৈচৈ!" />
              <span className="mt-3 block text-[clamp(1.1rem,2.1vw,1.6rem)] font-normal text-mist-300">{HOME_META.tagline}</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-mist-400">{HOME_META.intro}</p>
          </div>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Magnetic>
              <Btn href="#latest">সর্বশেষ সংগ্রহ</Btn>
            </Magnetic>
            <Btn href="/admin" variant="outline">
              ডেস্ক লঞ্চ
            </Btn>
          </div>
        </div>

        <div className="surface relative col-span-1 overflow-hidden rounded-2xl p-5 lg:row-span-2">
          <img src="/images/newsroom.jpg" alt="নিউজরুম" className="ken-burns absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
          <div className="relative flex h-full min-h-[220px] flex-col justify-end">
            <span className="mono-label mb-2" style={{ color: "var(--accent)" }}>
              AUTOMATION PIPELINE
            </span>
            <p className="font-display-bn text-xl leading-snug text-mist-100">প্রতি ২ ঘণ্টায় ছয় ধাপ, শূন্য ছোঁয়া।</p>
            <Link href="#pipeline" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-mist-200 hover:text-white">
              পুরো ব্লুপ্রিন্ট <ArrowDown className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="surface card-lift col-span-1 rounded-2xl p-5">
          <p className="mono-label text-mist-400">সংগৃহীত রেকর্ড</p>
          <p className="font-latin mt-2 text-4xl font-bold text-mist-100">
            <CountUp value={totals.collected} />
          </p>
          <div className="mt-3 h-10">
            <SparklineWrap data={spark} color="#ff5c38" bare />
          </div>
        </div>

        <div className="surface card-lift col-span-1 rounded-2xl p-5">
          <p className="mono-label text-mist-400">প্রকাশিত</p>
          <p className="font-latin mt-2 text-4xl font-bold" style={{ color: "#f5a524" }}>
            <CountUp value={totals.published} />
          </p>
          <div className="mt-3 h-10">
            <SparklineWrap data={sparkPub} color="#f5a524" bare />
          </div>
        </div>

        <div className="surface col-span-1 rounded-2xl p-5 lg:col-span-2">
          <p className="mono-label mb-3 text-mist-400">PIPELINE HEALTH</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PIPELINE_GAUGES.map((g) => (
              <div key={g.label}>
                <div className="flex items-baseline gap-1">
                  <span className="font-latin text-xl font-bold" style={{ color: g.color }}>
                    <CountUp value={g.value} suffix="%" />
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-tight text-mist-400">{g.label}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${g.value}%`, background: g.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface col-span-1 flex items-center gap-4 rounded-2xl p-5 lg:col-span-2">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
            <Terminal className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <p className="mono-label text-mist-400">LAST RUN</p>
            <p className="truncate font-mono text-[12.5px] text-mist-200">
              {PIPELINE_STEPS.map((s) => s.key).join(" → ")}
            </p>
          </div>
          <LiveClock className="mono-label ml-auto hidden shrink-0 text-mist-300 sm:block" />
        </div>
      </div>
    </SectionShell>
  );
}

/* ───────────────── variant 4 · terminal console ───────────────── */
const CONSOLE_LINES = [
  "$ hoichoi sync --source=facebook --watchlist=10",
  "→ collecting 14 records … shot 14 · hashed 14",
  "→ duplicate gate: 3 blocked (simhash hamming ≤ 2)",
  "→ rewrite desk: 9 drafts · fact-gate 0.92 avg",
  "✓ deployed to production in 8.2s (ISR)",
];

function TerminalHero({ totals }: { totals: HeroProps["totals"] }) {
  return (
    <SectionShell density="comfortable" className="pt-10">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center">
          <Badge tone="ok">
            <CircleDot className="h-3 w-3" /> CLI · v2.4
          </Badge>
          <h1 className="font-mono mt-6 text-[clamp(1.9rem,4.6vw,3.4rem)] font-bold leading-[1.1] text-mist-100">
            hoichoi<span style={{ color: "var(--accent)" }}>.</span>feed
          </h1>
          <p className="font-display-bn mt-4 max-w-md text-xl leading-snug text-mist-300">
            {HOME_META.tagline} — ছয় ধাপের পাইপলাইন, প্রতিটি রান লগ করা।
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Btn href="#live-insights" icon={false}>
              <Terminal className="h-4 w-4" /> রান লগ দেখুন
            </Btn>
            <Btn href="/admin" variant="outline">
              কনফিগ
            </Btn>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "collected", v: totals.collected },
              { k: "published", v: totals.published },
              { k: "duplicates", v: totals.dupes },
              { k: "comments", v: totals.comments },
            ].map((s) => (
              <div key={s.k} className="border-l-2 pl-3" style={{ borderColor: "var(--accent)" }}>
                <p className="font-latin text-2xl font-bold text-mist-100">
                  <CountUp value={s.v} />
                </p>
                <p className="mono-label mt-1 text-mist-400">{s.k}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-hi overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/8 bg-ink-950/70 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint-400/80" />
            <span className="mono-label ml-2 text-mist-400">hoichoi@newsroom — pipeline.sh</span>
            <LiveClock className="mono-label ml-auto text-mist-400" />
          </div>
          <div className="p-5 font-mono text-[12.5px] leading-[1.9] text-mist-300">
            <TypeWriter lines={CONSOLE_LINES} />
            <pre className={clsx("mt-4 overflow-x-auto rounded-lg border border-white/8 bg-ink-950/60 p-4 text-[11.5px] text-mist-400")}>
{`{
  "run": "run_2f91ab",
  "collected": ${totals.collected},
  "published": ${totals.published},
  "duplicates": ${totals.dupes},
  "approved_comments": ${totals.comments},
  "fact_gate": 0.92,
  "deploy": "isr ~8s"
}`}
            </pre>
            <div className="mt-4 flex items-center gap-2">
              <span className="mono-label text-mint-400">READY</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                <div className="shimmer h-full w-full" />
              </div>
            </div>
          </div>
          <div className="border-t border-white/8 px-5 py-3">
            <p className="mono-label text-mist-400">
              রান সম্পন্ন · মোট সময় <span className="text-mist-200">{bn(42)} সে</span> · আউটপুট{" "}
              <span className="text-mist-200">{bnCompact(totals.published)} রেকর্ড</span>
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ───────────────── variant 5 · centered editorial ───────────────── */
function CenterHero({ totals, density }: { totals: HeroProps["totals"]; density: HeroProps["density"] }) {
  return (
    <SectionShell density={density} className="pt-12 text-center md:pt-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
          <Badge tone="hot">
            <LiveDot tone="hot" /> লাইভ বাংলা সংবাদকক্ষ
          </Badge>
          <Badge tone="ok">
            <ShieldCheck className="h-3 w-3" /> ফ্যাক্ট-গেট সক্রিয়
          </Badge>
        </div>

        <h1 className="font-display-bn text-[clamp(2.8rem,7.5vw,5.5rem)] leading-[1.04] text-mist-100">
          <Scramble text="হৈচৈ!" />
          <span className="mt-3 block text-[clamp(1.4rem,3vw,2.2rem)] font-normal text-mist-300">
            {HOME_META.tagline}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-mist-400">
          {HOME_META.intro}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <Btn href="#latest">সর্বশেষ খবর পড়ুন</Btn>
          </Magnetic>
          <Btn href="#live-insights" variant="outline">
            লাইভ নলেজ গ্রাফ
          </Btn>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "সংগৃহীত রেকর্ড", v: totals.collected, c: "#ff5c38" },
            { k: "প্রকাশিত প্রতিবেদন", v: totals.published, c: "#f5a524" },
            { k: "ডুপ্লিকেট বাতিল", v: totals.dupes, c: "#56c8ff" },
            { k: "অনুমোদিত মন্তব্য", v: totals.comments, c: "#4ade80" },
          ].map((item) => (
            <div key={item.k} className="surface card-lift rounded-2xl p-5 text-center">
              <p className="font-latin text-3xl font-bold" style={{ color: item.c }}>
                <CountUp value={item.v} />
              </p>
              <p className="mt-2 text-[13px] text-mist-400">{item.k}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

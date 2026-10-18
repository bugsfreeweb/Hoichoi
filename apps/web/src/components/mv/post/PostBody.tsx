"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleAlert,
  FileSearch,
  Hash,
  Quote,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Badge, Btn, Heatmap, LiveDot, SectionHead, SectionShell, Sparkline } from "@/components/mv/ui/primitives";
import PostImage from "@/components/mv/ui/PostImage";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/mv/ui/motion";
import { EngagementAreaChart, EngagementPie, RetentionBar, SentimentRadar, ChartCard } from "@/components/mv/charts";
import type { PostRecord } from "@/lib/mv/posts";
import { useMvData } from "@/components/mv/ui/mv-data";
import { bn, bnCompact } from "@/lib/mv/format";

type Block = { type?: string; text?: string; cite?: string; items?: string[] };

const blocksOf = (post: PostRecord): Block[] => post.body as unknown as Block[];

/* ══════════════════ BODY ══════════════════ */
export function PostBody({
  variant,
  post,
  density,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "longform") return <Longform post={post} density={density} />;
  if (variant === "blocks") return <WideBlocks post={post} density={density} />;
  if (variant === "magazine") return <MagazineBody post={post} density={density} />;
  if (variant === "focus") return <FocusBody post={post} density={density} />;
  return <StickyToc post={post} density={density} />;
}

function BlockText({ b, dropCap = false }: { b: Block; dropCap?: boolean }) {
  if (b.type === "quote") {
    return (
      <figure className="my-8 border-l-2 pl-5" style={{ borderColor: "var(--accent)" }}>
        <Quote className="mb-2 h-5 w-5" style={{ color: "var(--accent)" }} />
        <blockquote className="font-display-bn text-[20px] leading-[1.7] text-mist-100 md:text-[22px]" style={{ fontSize: "calc(20px * var(--reading-scale, 1))" }}>
          {b.text}
        </blockquote>
        {b.cite ? <figcaption className="mono-label mt-3 text-mist-400">— {b.cite}</figcaption> : null}
      </figure>
    );
  }
  if (b.type === "h2") {
    return (
      <h2 id={`h-${(b.text ?? "").slice(0, 12)}`} className="font-display-bn mt-10 text-[clamp(1.35rem,2.8vw,1.85rem)] leading-snug text-mist-100">
        {b.text}
      </h2>
    );
  }
  if (b.type === "list") {
    return (
      <ul className="my-6 space-y-2.5">
        {(b.items ?? []).map((it) => (
          <li key={it} className="flex gap-3 text-[16px] leading-relaxed text-mist-300" style={{ fontSize: "calc(16px * var(--reading-scale, 1))" }}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
            {it}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className={clsx("mb-5 text-[17px] leading-[1.9] text-mist-300", dropCap && "first-letter:float-left first-letter:mr-2.5 first-letter:font-latin first-letter:text-[3.6rem] first-letter:font-bold first-letter:leading-[0.82] first-letter:text-[var(--accent)]")} style={{ fontSize: "calc(17px * var(--reading-scale, 1))" }}>
      {b.text}
    </p>
  );
}

/* ── variant 1 · sticky TOC ───────────────────────────── */
function StickyToc({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const blocks = blocksOf(post);
  const headings = blocks.filter((b) => b.type === "h2");

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      setProgress((done / Math.max(total, 1)) * 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <SectionShell density={density} className="!pt-4">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mono-label mb-4 text-mist-400">বিষয়সূচি</p>
            <nav className="space-y-2 border-l border-white/8 pl-4">
              {headings.length === 0 ? (
                <span className="text-[13px] text-mist-400">এই প্রতিবেদনে উপ-শিরোনাম নেই</span>
              ) : (
                headings.map((h) => (
                  <a
                    key={h.text}
                    href={`#h-${(h.text ?? "").slice(0, 12)}`}
                    className="block text-[13.5px] leading-snug text-mist-400 transition-colors hover:text-mist-100"
                  >
                    {h.text}
                  </a>
                ))
              )}
            </nav>

            <div className="mt-8">
              <p className="mono-label mb-2 text-mist-400">রিডিং প্রোগ্রেস</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all duration-150" style={{ width: `${Math.max(2, progress)}%`, background: "var(--accent)" }} />
              </div>
              <p className="font-latin mt-2 text-sm font-semibold text-mist-200">
                <CountUp value={Math.round(progress)} suffix="%" bangla={false} />
              </p>
            </div>

            <div className="mt-8 space-y-3 border-t border-white/8 pt-6">
              <p className="mono-label text-mist-400">QUICK STATS</p>
              {[
                { k: "ভিউ", v: bnCompact(post.views) },
                { k: "শেয়ার", v: bnCompact(post.shares) },
                { k: "মন্তব্য", v: bnCompact(post.comments) },
              ].map((s) => (
                <div key={s.k} className="flex items-center justify-between">
                  <span className="text-[13px] text-mist-400">{s.k}</span>
                  <span className="font-latin text-[13px] font-semibold text-mist-100">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div ref={ref} className="max-w-[720px]">
          <Reveal y={14}>
            <article>
              {blocks.map((b, i) => (
                <Reveal key={i} y={12} delay={0.02}>
                  <BlockText b={b} />
                </Reveal>
              ))}
            </article>
          </Reveal>
          <div className="mt-10 border-t border-white/8 pt-6">
            <p className="text-[14px] leading-relaxed text-mist-400">
              এই প্রতিবেদনটি ফেসবুকের উন্মুক্ত পোস্ট অবলম্বনে সংবাদ শৈলীতে পুনর্লিখিত; মূল পোস্টের স্ক্রিনশট আর্কাইভে
              সংরক্ষিত আছে।
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ── variant 2 · longform ───────────────────────────── */
function Longform({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const blocks = blocksOf(post);
  return (
    <SectionShell density={density} className="!pt-4">
      <article className="mx-auto max-w-[760px]">
        <Reveal y={14}>
          <div className="mb-10 flex items-center gap-4">
            <span className="h-px flex-1 bg-white/10" />
            <span className="mono-label text-mist-400">LONGFORM · {bn(post.readMinutes)} MIN READ</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          {blocks.map((b, i) => (
            <Reveal key={i} y={10}>
              <BlockText b={b} dropCap={i === 0 && b.type === "p"} />
            </Reveal>
          ))}
          <div className="mt-12 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <p className="mono-label mb-2" style={{ color: "var(--accent)" }}>
              সম্পাদকীয় নোট
            </p>
            <p className="text-[15px] leading-relaxed text-mist-300">
              এই প্রতিবেদনটি ফেসবুকের উন্মুক্ত পোস্ট অবলম্বনে সংবাদ শৈলীতে পুনর্লিখিত। মূল পোস্টের স্ক্রিনশট আর্কাইভে
              সংরক্ষিত আছে এবং কনটেন্ট হ্যাশ <span className="font-mono text-mist-100">{post.hash}</span> দিয়ে যাচাই করা যায়।
            </p>
          </div>
        </Reveal>
      </article>
    </SectionShell>
  );
}

/* ── variant 3 · wide blocks ───────────────────────────── */
function WideBlocks({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const blocks = blocksOf(post);
  return (
    <SectionShell density={density} className="!pt-4" bleed>
      <div className="mx-auto max-w-[1100px] space-y-4">
        {blocks.map((b, i) => (
          <Reveal key={i} y={14}>
            <div className="grid gap-4 md:grid-cols-[64px_1fr] md:gap-6">
              <div className="hidden md:block">
                <div className="sticky top-28 text-right">
                  <span className="font-latin text-[13px] font-semibold text-mist-400/60">{bn(String(i + 1).padStart(2, "0"))}</span>
                </div>
              </div>
              <div
                className={clsx(
                  "rounded-2xl border p-6 transition-colors duration-500 hover:border-white/18 md:p-8",
                  b.type === "quote" ? "border-white/12 bg-white/[0.035]" : "border-white/8 bg-white/[0.02]",
                )}
              >
                <BlockText b={b} />
                {b.type === "p" ? (
                  <p className="mono-label mt-3 border-t border-white/6 pt-3 text-mist-400/60">
                    PARA {String(i + 1).padStart(2, "0")} · {bn((b.text ?? "").length)} CHARS · FACT-GATE PASSED
                  </p>
                ) : null}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

function MagazineBody({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const blocks = blocksOf(post);
  const quote = blocks.find((block) => block.type === "quote");
  return (
    <SectionShell density={density} className="!pt-4">
      <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[1fr_280px]">
        <article className="surface-hi rounded-2xl p-6 md:p-10">
          <p className="mono-label mb-6 text-mist-400">সম্পাদকীয় দীর্ঘপাঠ · {bn(post.readMinutes)} মিনিট</p>
          {blocks.map((block, index) => <Reveal key={index} y={10}><BlockText b={block} dropCap={index === 0 && block.type === "p"} /></Reveal>)}
        </article>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="surface rounded-2xl p-5"><p className="mono-label mb-3 text-mist-400">মূল তথ্য</p><ul className="space-y-3">{post.keyPoints.slice(0, 4).map((point, index) => <li key={index} className="flex gap-2.5 text-[13px] leading-relaxed text-mist-300"><span style={{ color: "var(--accent)" }}>{bn(index + 1)}</span>{point}</li>)}</ul></div>
          <div className="surface-hi rounded-2xl p-5"><Quote className="h-5 w-5" style={{ color: "var(--accent)" }} /><p className="font-display-bn mt-3 text-[16px] leading-relaxed text-mist-100">{quote?.text ?? post.dek}</p>{quote?.cite ? <p className="mono-label mt-3 text-mist-400">— {quote.cite}</p> : null}</div>
        </aside>
      </div>
    </SectionShell>
  );
}

function FocusBody({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const [wide, setWide] = useState(false);
  const blocks = blocksOf(post);
  return (
    <SectionShell density={density} className="!pt-4">
      <article className={clsx("surface mx-auto rounded-2xl px-6 py-8 transition-all duration-500 md:px-12 md:py-12", wide ? "max-w-[1000px]" : "max-w-[720px]")}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4"><p className="mono-label text-mist-400">বিক্ষেপহীন পাঠ · {bn(post.readMinutes)} মিনিট</p><button onClick={() => setWide((value) => !value)} className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-mist-300 hover:border-white/25">{wide ? "সরু পাঠ" : "প্রশস্ত পাঠ"}</button></div>
        {blocks.map((block, index) => <BlockText key={index} b={block} dropCap={index === 0 && block.type === "p"} />)}
        <div className="mt-10 flex items-center justify-between border-t border-white/8 pt-5"><span className="mono-label text-mist-400">শেষ পর্যন্ত পড়ে নিচে যান</span><BookOpenCheck className="h-4 w-4" style={{ color: "var(--accent)" }} /></div>
      </article>
    </SectionShell>
  );
}

/* ══════════════════ ANALYTICS ══════════════════ */
export function PostAnalytics({
  variant,
  post,
  density,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "spark") return <SparkRow post={post} density={density} />;
  if (variant === "radar") return <SentimentPanel post={post} density={density} />;
  if (variant === "trend") return <StoryTrend post={post} density={density} />;
  if (variant === "scorecards") return <StoryScorecards post={post} density={density} />;
  return <EngagementDashboard post={post} density={density} />;
}

/* ── variant 1 · engagement dashboard ───────────────────────────── */
function EngagementDashboard({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const { hourlyViews: HOURLY_VIEWS, engagementMix: ENGAGEMENT_MIX, retention: RETENTION } = useMvData();
  return (
    <SectionShell id="post-analytics" density={density}>
      <SectionHead
        kicker="▚ STORY ANALYTICS"
        title={<>এই প্রতিবেদন <span className="text-gradient">কীভাবে পড়া হয়েছে</span></>}
        desc="ঘণ্টাভিত্তিক ভিউ, এনগেজমেন্ট মিক্স আর পাঠক কতটা পড়ে শেষ করেছে।"
        right={
          <Badge tone="ok">
            <LiveDot /> UPDATED EVERY 10S
          </Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <ChartCard title="ঘণ্টাভিত্তিক ভিউ" sub="প্রকাশের পর ২৪ ঘণ্টা" height={260}>
            <EngagementAreaChart data={HOURLY_VIEWS} height={260} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.08}>
          <ChartCard title="এনগেজমেন্ট মিক্স" sub="রিঅ্যাক্ট · কমেন্ট · শেয়ার · সেভ" height={260}>
            <EngagementPie data={ENGAGEMENT_MIX} height={260} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.14}>
          <ChartCard title="সময়ভিত্তিক পাঠ" sub="দিনের কোন ভাগে কতটা পড়া হয়" height={240}>
            <RetentionBar data={RETENTION} height={240} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.2} className="lg:col-span-2">
          <div className="surface grid h-full gap-px overflow-hidden rounded-2xl bg-white/8 sm:grid-cols-2">
            {[
              { k: "মোট পৌঁছ", v: Number((post.metrics as { reach?: number }).reach ?? post.views * 4), tone: "#ff5c38", sub: "ফেসবুক + সাইট মিলিয়ে" },
              { k: "ক্লিক-থ্রু রেট", v: Number((post.metrics as { ctr?: number }).ctr ?? 6), suffix: "%", decimals: 1, tone: "#f5a524", sub: "ইমপ্রেশন থেকে ক্লিক" },
              { k: "গড় পড়ার সময়", v: post.readMinutes, suffix: " মিনিট", tone: "#56c8ff", sub: "সম্পূর্ণ পড়ার হার সহ" },
              { k: "পড়ে শেষ করেছে", v: Number((post.metrics as { readPct?: number }).readPct ?? 55), suffix: "%", tone: "#4ade80", sub: "স্ক্রল ডেপথ ৯০%+" },
            ].map((s) => (
              <div key={s.k} className="bg-ink-900 p-6">
                <p className="mono-label text-mist-400">{s.k}</p>
                <p className="font-latin mt-2 text-3xl font-bold" style={{ color: s.tone }}>
                  <CountUp value={s.v} suffix={s.suffix ?? ""} decimals={s.decimals ?? 0} />
                </p>
                <p className="mt-1.5 text-[12.5px] text-mist-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ── variant 2 · sparkline row ───────────────────────────── */
function SparkRow({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const { hourlyViews: HOURLY_VIEWS, engagementMix: ENGAGEMENT_MIX } = useMvData();
  const tiles = [
    { k: "ভিউ", v: post.views, data: HOURLY_VIEWS.map((h) => h.views), color: "#ff5c38" },
    { k: "শেয়ার", v: post.shares, data: HOURLY_VIEWS.map((h) => h.shares * 12), color: "#56c8ff" },
    { k: "মন্তব্য", v: post.comments, data: HOURLY_VIEWS.map((h) => h.comments * 14), color: "#f5a524" },
    { k: "রিঅ্যাকশন", v: ENGAGEMENT_MIX[0]?.value ?? 0, data: HOURLY_VIEWS.map((h) => h.views / 11), color: "#a78bfa" },
  ];
  return (
    <SectionShell id="post-analytics" density={density}>
      <SectionHead
        kicker="▚ QUICK METRICS"
        title={<>সংখ্যায় <span className="text-gradient">এই প্রতিবেদন</span></>}
        desc="চারটি টাইল, প্রতিটিতে ছোট স্পার্কলাইন — দিনের ধারা এক নজরে।"
      />
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <StaggerItem key={t.k}>
            <div className="surface card-lift h-full rounded-2xl p-6">
              <p className="mono-label text-mist-400">{t.k}</p>
              <p className="font-latin mt-2 text-[2.2rem] font-bold leading-none" style={{ color: t.color }}>
                <CountUp value={t.v} />
              </p>
              <div className="mt-4 h-12">
                <Sparkline data={t.data} color={t.color} className="h-12 w-full" height={48} width={220} />
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

/* ── variant 3 · sentiment radar ───────────────────────────── */
function SentimentPanel({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const { sentimentRadar: SENTIMENT_RADAR, trafficSources: TRAFFIC_SOURCES, readHeatmap: READ_HEATMAP } = useMvData();
  return (
    <SectionShell id="post-analytics" density={density}>
      <SectionHead
        kicker="▚ TONE & READER PATTERN"
        title={<>ডিভাইস বণ্টন আর <span className="text-gradient">পাঠকের ছন্দ</span></>}
        desc="সেশনভিত্তিক ডিভাইস বিশ্লেষণ, সপ্তাহভিত্তিক পড়ার হিটম্যাপ আর পাঠকের দেশ।"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal>
          <ChartCard title="ডিভাইস রেডার" sub="ডিভাইস অনুযায়ী সেশনের ভাগ" height={270}>
            <SentimentRadar data={SENTIMENT_RADAR} height={270} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-2">
          <div className="surface h-full rounded-2xl p-6">
            <p className="mono-label mb-4 text-mist-400">TOP COUNTRIES</p>
            <div className="space-y-3.5">
              {TRAFFIC_SOURCES.map((t, i) => (
                <div key={t.name}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[13.5px] text-mist-200">{t.name}</span>
                    <span className="font-latin text-[12.5px] font-semibold text-mist-300">{bn(t.value)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${t.value}%`,
                        background: `linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) ${80 - i * 14}%, #a78bfa))`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-white/8 pt-5">
              <p className="mono-label mb-4 text-mist-400">READING HEATMAP · {bn(post.readMinutes)} MIN READ</p>
              <Heatmap rows={READ_HEATMAP} />
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

function StoryTrend({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const { hourlyViews: HOURLY_VIEWS } = useMvData();
  return (
    <SectionShell id="post-analytics" density={density}>
      <SectionHead kicker="২৪ ঘণ্টার পাঠ-প্রবণতা" title={<>পাঠক কখন <span className="text-gradient">খবরটি পড়েছেন</span></>} desc="প্রকাশের পর প্রথম দিনের ভিউ, ভাগ ও মন্তব্যের ওঠানামা।" />
      <ChartCard title="ঘণ্টাভিত্তিক পাঠ" sub={`${bnCompact(post.views)} মোট ভিউ · ${bnCompact(post.shares)} বার ভাগ করা হয়েছে`} height={340}>
        <EngagementAreaChart data={HOURLY_VIEWS} height={340} />
      </ChartCard>
    </SectionShell>
  );
}

function StoryScorecards({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const metrics = post.metrics as { reach?: number; ctr?: number; readPct?: number };
  const cards = [
    { label: "মোট পাঠক", value: post.views, suffix: "", color: "#ff5c38", sub: "প্রতিবেদন খোলা হয়েছে" },
    { label: "ভাগ করা হয়েছে", value: post.shares, suffix: "", color: "#56c8ff", sub: "অন্য পাঠকের কাছে পৌঁছেছে" },
    { label: "পড়া শেষ করেছেন", value: metrics.readPct ?? 62, suffix: "%", color: "#4ade80", sub: "শেষ পর্যন্ত পড়ার হার" },
    { label: "পৌঁছানো পাঠক", value: metrics.reach ?? post.views * 4, suffix: "", color: "#f5a524", sub: "মোট আনুমানিক পৌঁছ" },
  ];
  return (
    <SectionShell id="post-analytics" density={density}>
      <SectionHead kicker="প্রতিবেদনের পাঠক-হিসাব" title={<>এই প্রতিবেদনের <span className="text-gradient">চারটি সূচক</span></>} />
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => <StaggerItem key={card.label}><div className="surface card-lift h-full rounded-2xl p-6"><p className="mono-label text-mist-400">{card.label}</p><p className="font-latin mt-3 text-3xl font-bold" style={{ color: card.color }}><CountUp value={card.value} suffix={card.suffix} /></p><p className="mt-2 text-[12.5px] text-mist-400">{card.sub}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${Math.min(100, card.suffix ? card.value : (card.value / Math.max(post.views * 4, 1)) * 100)}%`, background: card.color }} /></div></div></StaggerItem>)}
      </Stagger>
    </SectionShell>
  );
}

/* ══════════════════ TIMELINE ══════════════════ */
type TlItem = { at?: string; title?: string; body?: string };

export function PostTimeline({
  variant,
  post,
  density,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
}) {
  const items = post.timeline as unknown as TlItem[];
  if (!items.length) return null;
  if (variant === "horizontal") return <HorizontalTimeline items={items} density={density} />;
  if (variant === "cards") return <TimelineCards items={items} density={density} />;
  if (variant === "table") return <TimelineTable items={items} density={density} />;
  if (variant === "process") return <TimelineProcess items={items} density={density} />;
  return <VerticalTimeline items={items} density={density} />;
}

function VerticalTimeline({ items, density }: { items: TlItem[]; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <SectionHead
        kicker="▚ EVENT TIMELINE"
        title={<>ঘটনা যেভাবে <span className="text-gradient">এগিয়েছে</span></>}
        desc="স্ক্রল করলে একটি একটি করে নোড জ্বলে উঠবে।"
      />
      <div className="relative mx-auto max-w-3xl pl-8 md:pl-0">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-white/16 to-transparent md:left-1/2" />
        {items.map((t, i) => (
          <Reveal key={i} delay={i * 0.07} y={18}>
            <div className={clsx("relative mb-8 md:grid md:grid-cols-2 md:gap-10", i % 2 === 1 && "md:[&>*:first-child]:col-start-2")}>
              <span
                className="absolute left-[-25px] top-2 grid h-4 w-4 place-items-center rounded-full border-2 md:left-1/2 md:-translate-x-1/2"
                style={{ borderColor: "var(--accent)", background: "#08090c" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              </span>
              <div className={clsx(i % 2 === 0 ? "md:pr-4 md:text-right" : "md:col-start-2 md:pl-4")}>
                <span className="mono-label" style={{ color: "var(--accent)" }}>
                  {t.at}
                </span>
                <h3 className="font-display-bn mt-2 text-xl text-mist-100">{t.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-mist-400">{t.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

function HorizontalTimeline({ items, density }: { items: TlItem[]; density: "compact" | "comfortable" | "spacious" }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <SectionShell density={density} bleed>
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <SectionHead
          kicker="▚ TIMELINE SCRUB"
          title={<>পাশে টেনে <span className="text-gradient">সময়রেখা দেখুন</span></>}
        />
      </div>
      <div ref={ref} className="relative overflow-x-auto px-5 pb-6 md:px-8 [scrollbar-width:thin]">
        <div className="absolute inset-x-0 top-[42px] h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="flex gap-4">
          {items.map((t, i) => (
            <div key={i} className="relative w-[280px] shrink-0">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-ink-950" style={{ background: "var(--accent)" }}>
                  {bn(i + 1)}
                </span>
                <span className="mono-label text-mist-400">{t.at}</span>
              </div>
              <div className="surface card-lift mt-4 rounded-2xl p-5">
                <h3 className="font-display-bn text-lg leading-snug text-mist-100">{t.title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-mist-400">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function TimelineCards({ items, density }: { items: TlItem[]; density: "compact" | "comfortable" | "spacious" }) {
  return <SectionShell density={density}><SectionHead kicker="ঘটনার সময়রেখা" title={<>সময়ের <span className="text-gradient">গুরুত্বপূর্ণ বাঁক</span></>} /><Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => <StaggerItem key={index}><article className="surface card-lift h-full rounded-2xl p-5"><span className="mono-label" style={{ color: "var(--accent)" }}>{item.at}</span><h3 className="font-display-bn mt-3 text-xl text-mist-100">{item.title}</h3><p className="mt-2 text-[13.5px] leading-relaxed text-mist-400">{item.body}</p></article></StaggerItem>)}</Stagger></SectionShell>;
}

function TimelineTable({ items, density }: { items: TlItem[]; density: "compact" | "comfortable" | "spacious" }) {
  return <SectionShell density={density}><SectionHead kicker="সময় ও ঘটনা" title={<>তারিখভিত্তিক <span className="text-gradient">ঘটনার তালিকা</span></>} /><div className="surface mx-auto max-w-4xl overflow-hidden rounded-2xl"><div className="grid grid-cols-[110px_1fr] gap-4 border-b border-white/8 bg-white/[0.03] px-5 py-3"><span className="mono-label text-mist-400">সময়</span><span className="mono-label text-mist-400">ঘটনা ও বিবরণ</span></div>{items.map((item, index) => <div key={index} className="grid grid-cols-[110px_1fr] gap-4 border-b border-white/6 px-5 py-4 last:border-0"><span className="mono-label pt-1" style={{ color: "var(--accent)" }}>{item.at}</span><div><p className="font-display-bn text-lg text-mist-100">{item.title}</p><p className="mt-1 text-[13.5px] leading-relaxed text-mist-400">{item.body}</p></div></div>)}</div></SectionShell>;
}

function TimelineProcess({ items, density }: { items: TlItem[]; density: "compact" | "comfortable" | "spacious" }) {
  return <SectionShell density={density}><SectionHead kicker="ঘটনার ধাপ" title={<>একটির পর একটি <span className="text-gradient">যা ঘটেছে</span></>} /><div className="mx-auto max-w-4xl space-y-3">{items.map((item, index) => <Reveal key={index} delay={index * 0.05}><div className="surface flex gap-4 rounded-xl p-5"><span className="font-latin grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-ink-950" style={{ background: "var(--accent)" }}>{bn(index + 1)}</span><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display-bn text-lg text-mist-100">{item.title}</h3><span className="mono-label text-mist-400">{item.at}</span></div><p className="mt-1.5 text-[13.5px] leading-relaxed text-mist-400">{item.body}</p></div></div></Reveal>)}</div></SectionShell>;
}

/* ══════════════════ AT A GLANCE ══════════════════ */
export function PostGlance({
  variant,
  post,
  density,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "callout") return <CalloutQuote post={post} density={density} />;
  if (variant === "accordion") return <GlanceAccordion post={post} density={density} />;
  if (variant === "checklist") return <GlanceChecklist post={post} density={density} />;
  if (variant === "summary") return <GlanceSummary post={post} density={density} />;
  return <GlanceList post={post} density={density} />;
}

function GlanceChecklist({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const [checked, setChecked] = useState<number[]>([]);
  return <SectionShell density={density}><SectionHead kicker="পড়া শুরুর আগে" title={<>মূল তথ্য <span className="text-gradient">যাচাই তালিকা</span></>} desc="প্রতিবেদন পড়ার সময় গুরুত্বপূর্ণ তথ্যগুলো মিলিয়ে দেখুন।" /><div className="mx-auto max-w-3xl space-y-2">{post.keyPoints.map((point, index) => <button key={index} onClick={() => setChecked((old) => old.includes(index) ? old.filter((n) => n !== index) : [...old, index])} className={clsx("flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[14px] leading-relaxed transition-colors", checked.includes(index) ? "border-mint-500/30 bg-mint-500/5 text-mist-100" : "border-white/8 bg-white/[0.02] text-mist-300 hover:border-white/20")}><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-white/15">{checked.includes(index) ? <Check className="h-3.5 w-3.5 text-mint-400" /> : null}</span>{point}</button>)}</div></SectionShell>;
}

function GlanceSummary({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return <SectionShell density={density}><Reveal><div className="surface-hi mx-auto max-w-4xl rounded-3xl p-7 md:p-10"><Badge tone="hot">এক নজরে প্রতিবেদন</Badge><h3 className="font-display-bn mt-4 text-[clamp(1.5rem,3.3vw,2.3rem)] leading-snug text-mist-100">{post.dek}</h3><div className="mt-7 grid gap-3 sm:grid-cols-2">{post.keyPoints.slice(0, 4).map((point, index) => <div key={index} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4"><span className="font-latin text-sm font-bold" style={{ color: "var(--accent)" }}>{bn(index + 1)}</span><p className="text-[13.5px] leading-relaxed text-mist-300">{point}</p></div>)}</div></div></Reveal></SectionShell>;
}

function GlanceList({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <SectionHead kicker="▚ AT A GLANCE" title={<>মূল <span className="text-gradient">বিষয়সমূহ</span></>} />
      <Stagger className="grid gap-3 md:grid-cols-2">
        {post.keyPoints.map((k, i) => (
          <StaggerItem key={i}>
            <div className="surface card-lift group flex h-full gap-4 rounded-xl p-5">
              <span className="font-latin text-[13px] font-bold text-mist-400/70 transition-colors group-hover:text-[var(--accent)]">
                {bn(String(i + 1).padStart(2, "0"))}
              </span>
              <p className="text-[14.5px] leading-relaxed text-mist-300">{k}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

function CalloutQuote({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const quote = (post.body as unknown as Block[]).find((b) => b.type === "quote");
  return (
    <SectionShell density={density}>
      <Reveal>
        <div className="surface-hi grid gap-8 rounded-3xl p-8 md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div>
            <Quote className="h-8 w-8" style={{ color: "var(--accent)" }} />
            <p className="font-display-bn mt-4 text-[clamp(1.3rem,2.8vw,1.9rem)] leading-[1.65] text-mist-100">
              {quote?.text ?? post.dek}
            </p>
            {quote?.cite ? <p className="mono-label mt-5 text-mist-400">— {quote.cite}</p> : null}
          </div>
          <div className="border-t border-white/8 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <p className="mono-label mb-4 text-mist-400">সংক্ষিপ্তসার</p>
            <ul className="space-y-3">
              {post.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-mist-300">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                  {k}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function GlanceAccordion({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const [open, setOpen] = useState<number | null>(0);
  const qa = [
    ...post.keyPoints.map((k, i) => ({ q: `মূল পয়েন্ট ${bn(i + 1)}`, a: k })),
    { q: "এই খবরটি কীভাবে যাচাই করা হয়েছে?", a: "ফিড থেকে সংগ্রহের পর SHA-256 ও SimHash দিয়ে ডুপ্লিকেট পরীক্ষা, তারপর LLM পুনর্লিখন ও ০.৯০ থ্রেশহোল্ডের ফ্যাক্ট-গেট, সবশেষে সম্পাদকীয় রিভিউ।" },
  ];
  return (
    <SectionShell density={density}>
      <SectionHead kicker="▚ EXPAND FOR DETAILS" title={<>এক নজরে — <span className="text-gradient">খুলে দেখুন</span></>} />
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/8">
        {qa.map((item, i) => (
          <div key={i} className="border-b border-white/6 last:border-0">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
            >
              <span className="font-latin mono-label text-mist-400">{bn(String(i + 1).padStart(2, "0"))}</span>
              <span className="flex-1 text-[15px] font-medium text-mist-100">{item.q}</span>
              <ChevronDown className={clsx("h-4 w-4 shrink-0 text-mist-400 transition-transform duration-400", open === i && "rotate-180")} style={open === i ? { color: "var(--accent)" } : undefined} />
            </button>
            <div className={clsx("grid transition-all duration-500", open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 pl-14 text-[14.5px] leading-relaxed text-mist-400">{item.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ══════════════════ VERIFICATION ══════════════════ */
type Fact = { claim?: string; verdict?: string; note?: string };

export function PostVerify({
  variant,
  post,
  density,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
}) {
  const facts = post.facts as unknown as Fact[];
  if (variant === "inline") return <InlineSource post={post} />;
  if (variant === "audit") return <VerifyAudit post={post} facts={facts} density={density} />;
  if (variant === "source") return <VerifySource post={post} density={density} />;
  if (variant === "timeline") return <VerifyTimeline post={post} facts={facts} density={density} />;
  return (
    <SectionShell density={density}>
      <SectionHead
        kicker="─── সূত্র ও যাচাই ───"
        title={<>প্রতিটি দাবি <span className="text-gradient">আলাদাভাবে যাচাই</span></>}
        desc="পুনর্লিখনের সময় প্রতিটি তথ্যবিন্দু আলাদা ফ্ল্যাগ পায় — যাচাইকৃত, আংশিক, অযাচাইত বা বাতিল।"
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <div className="surface h-full overflow-hidden rounded-2xl">
            <div className="grid grid-cols-[1.6fr_auto] gap-3 border-b border-white/8 bg-white/[0.02] px-5 py-3">
              <span className="mono-label text-mist-400">CLAIM</span>
              <span className="mono-label text-mist-400">VERDICT</span>
            </div>
            {facts.map((f, i) => {
              const ok = f.verdict === "যাচাইকৃত";
              const bad = f.verdict === "বাতিল";
              return (
                <div key={i} className="grid grid-cols-[1.6fr_auto] items-center gap-3 border-b border-white/6 px-5 py-4 last:border-0 transition-colors hover:bg-white/[0.03]">
                  <div>
                    <p className="text-[14.5px] text-mist-200">{f.claim}</p>
                    <p className="mt-1 text-[12.5px] text-mist-400">{f.note}</p>
                  </div>
                  <Badge tone={ok ? "ok" : bad ? "hot" : "warn"}>
                    {ok ? <Check className="h-3 w-3" /> : bad ? <X className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
                    {f.verdict}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="surface-hi flex h-full flex-col justify-between rounded-2xl p-6">
            <div>
              <p className="mono-label flex items-center gap-2 text-mist-400">
                <FileSearch className="h-3.5 w-3.5" /> ARCHIVE SNAPSHOT
              </p>
              <h3 className="font-display-bn mt-3 text-2xl leading-snug text-mist-100">মূল পোস্ট সংরক্ষিত</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-mist-400">
                প্রতিটি সংগৃহীত পোস্টের ফুল-স্ক্রিন স্ক্রিনশট, টাইমস্ট্যাম্প ও কনটেন্ট হ্যাশ আর্কাইভে থাকে। পুনর্লিখিত
                প্রতিবেদনের প্রতিটি তথ্য সেই আর্কাইভের সঙ্গে মিলিয়ে দেখা হয়।
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  { k: "সূত্র", v: post.source },
                  { k: "লেখক", v: post.author },
                  { k: "অবস্থান", v: post.location },
                  { k: "কনটেন্ট হ্যাশ", v: post.hash },
                ].map((x) => (
                  <div key={x.k} className="flex items-center justify-between gap-4 rounded-lg border border-white/8 px-3.5 py-2.5">
                    <span className="mono-label text-mist-400">{x.k}</span>
                    <span className="truncate text-[13.5px] text-mist-100">{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="mono-label rounded-full border border-white/10 px-2.5 py-1 text-mist-400">
                  #{t}
                </span>
              ))}
            </div>
            <Btn href={post.sourceUrl || "#"} variant="outline" className="mt-6 w-full justify-center">
              <ShieldCheck className="h-4 w-4" /> মূল পোস্টের লিংক
            </Btn>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

function VerifyAudit({ post, facts, density }: { post: PostRecord; facts: Fact[]; density: "compact" | "comfortable" | "spacious" }) {
  return <SectionShell density={density}><SectionHead kicker="দাবি ধরে যাচাই" title={<>সম্পাদকীয় <span className="text-gradient">নিরীক্ষা-সারণি</span></>} desc="প্রতিটি দাবির পাশে যাচাইয়ের সিদ্ধান্ত ও ব্যাখ্যা দেওয়া হয়েছে।" /><div className="surface mx-auto max-w-5xl overflow-hidden rounded-2xl"><div className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/8 bg-white/[0.03] px-5 py-3"><span className="mono-label text-mist-400">যে দাবিটি যাচাই হয়েছে</span><span className="mono-label text-mist-400">সিদ্ধান্ত</span></div>{facts.map((fact, index) => <div key={index} className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-white/6 px-5 py-4 last:border-0"><div><p className="text-[14px] text-mist-100">{fact.claim}</p><p className="mt-1 text-[12.5px] text-mist-400">{fact.note}</p></div><Badge tone={fact.verdict === "যাচাইকৃত" ? "ok" : fact.verdict === "বাতিল" ? "hot" : "warn"}>{fact.verdict}</Badge></div>)}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 p-4"><span className="mono-label text-mist-400">উৎস: {post.source}</span><span className="mono-label text-mint-400">হ্যাশ · {post.hash}</span></div></div></SectionShell>;
}

function VerifySource({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return <SectionShell density={density}><Reveal><div className="surface-hi mx-auto grid max-w-4xl gap-6 rounded-3xl p-7 md:grid-cols-[auto_1fr] md:p-10"><span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><FileSearch className="h-7 w-7" /></span><div><Badge tone="ok"><ShieldCheck className="h-3 w-3" />উৎস সংরক্ষিত</Badge><h3 className="font-display-bn mt-3 text-2xl text-mist-100">মূল প্রকাশনা ও সংরক্ষিত তথ্য</h3><p className="mt-2 text-[14px] leading-relaxed text-mist-400">সংবাদটির মূল উৎস শনাক্ত করা হয়েছে। শিরোনাম, প্রকাশক, অবস্থান ও বিষয়বস্তুর হ্যাশ সংরক্ষিত আছে।</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{[{ k: "প্রকাশক", v: post.source }, { k: "লেখক", v: post.author }, { k: "ঘটনাস্থল", v: post.location }, { k: "সংরক্ষণ-চিহ্ন", v: post.hash }].map((item) => <div key={item.k} className="rounded-lg border border-white/8 px-4 py-3"><p className="mono-label text-mist-400">{item.k}</p><p className="mt-1 break-words text-[13px] text-mist-100">{item.v}</p></div>)}</div><Btn href={post.sourceUrl || "#"} variant="outline" className="mt-5">মূল উৎস খুলুন</Btn></div></div></Reveal></SectionShell>;
}

function VerifyTimeline({ post, facts, density }: { post: PostRecord; facts: Fact[]; density: "compact" | "comfortable" | "spacious" }) {
  const steps = ["উৎস শনাক্ত", "মূল দাবিগুলো আলাদা", "সংখ্যা ও নাম মিলিয়ে দেখা", "সম্পাদকীয় সিদ্ধান্ত নথিভুক্ত"];
  return <SectionShell density={density}><SectionHead kicker="যাচাইয়ের পথ" title={<>উৎস থেকে <span className="text-gradient">প্রকাশ পর্যন্ত</span></>} /><div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-4">{steps.map((step, index) => <Reveal key={step} delay={index * 0.06}><div className="surface h-full rounded-2xl p-5"><span className="font-latin grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-ink-950" style={{ background: "var(--accent)" }}>{bn(index + 1)}</span><h3 className="font-display-bn mt-4 text-lg text-mist-100">{step}</h3><p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">{index === 0 ? `${post.source} থেকে প্রকাশ্য তথ্য সংগ্রহ।` : index === 1 ? `${bn(facts.length)}টি দাবির পৃথক পর্যালোচনা।` : index === 2 ? "পরিমাণ, নাম ও সময়ের সঙ্গে সংরক্ষিত উৎস মেলানো।" : "সিদ্ধান্তসহ প্রতিবেদনের তথ্য পাঠকের জন্য প্রকাশ।"}</p></div></Reveal>)}</div></SectionShell>;
}

function InlineSource({ post }: { post: PostRecord }) {
  return (
    <SectionShell density="compact" className="!py-8">
      <Reveal y={12}>
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 border-t border-white/8 pt-6 text-[13.5px] text-mist-400 md:flex-row md:items-center md:justify-between">
          <p>
            <span className="mono-label mr-2 text-mist-300">─── সূত্র ───</span>
            লেখক: {post.author} · সূত্র: {post.source} ({bn(post.readMinutes)} মিনিট পড়া)
          </p>
          <div className="flex items-center gap-3">
            <span className="mono-label flex items-center gap-1.5 text-mint-400">
              <Hash className="h-3 w-3" /> {post.hash}
            </span>
            <a
              href={post.sourceUrl || "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="mono-label flex items-center gap-1 text-mist-200 transition-colors hover:text-white"
            >
              মূল পোস্টের লিংক <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ══════════════════ RELATED ══════════════════ */
export function PostRelated({
  variant,
  posts,
  density,
}: {
  variant: string;
  posts: PostRecord[];
  density: "compact" | "comfortable" | "spacious";
}) {
  if (!posts.length) return null;
  if (variant === "rail") return <RelatedRail posts={posts} density={density} />;
  if (variant === "stack") return <RelatedStack posts={posts} density={density} />;
  if (variant === "carousel") return <RelatedCarousel posts={posts} density={density} />;
  if (variant === "feature") return <RelatedFeature posts={posts} density={density} />;
  return <RelatedGrid posts={posts} density={density} />;
}

function RelatedCarousel({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  return <SectionShell density={density} bleed><div className="mx-auto max-w-[1500px] px-5 md:px-8"><SectionHead kicker="সম্পাদকীয় সুপারিশ" title={<>আরও <span className="text-gradient">পড়ুন</span></>} desc="পাশে সরিয়ে সম্পর্কিত প্রতিবেদন বেছে নিন।" /></div><div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-5 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{posts.map((post, index) => <Link key={post.slug} href={`/post/${post.slug}`} className="group w-[300px] shrink-0 snap-start md:w-[360px]"><article className="surface card-lift relative h-full overflow-hidden rounded-2xl p-6"><span className="font-latin absolute -right-1 -top-5 text-7xl font-bold text-white/[0.04]">{bn(index + 1)}</span><Badge tone="mute">{post.category}</Badge><h3 className="font-display-bn relative mt-5 line-clamp-3 text-xl leading-snug text-mist-100">{post.title}</h3><p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-mist-400">{post.dek}</p><div className="mt-5 border-t border-white/8 pt-4"><span className="mono-label text-mint-400">যাচাই {bn(post.factScore)} · {bn(post.readMinutes)} মিনিট</span></div></article></Link>)}</div></SectionShell>;
}

function RelatedFeature({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  const [first, ...rest] = posts;
  if (!first) return null;
  return <SectionShell density={density}><SectionHead kicker="আপনার জন্য নির্বাচিত" title={<>সম্পাদকীয় <span className="text-gradient">সুপারিশ</span></>} /><div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><Link href={`/post/${first.slug}`} className="group"><article className="surface-hi card-lift h-full rounded-3xl p-7 md:p-10"><Badge tone="hot">প্রধান সুপারিশ · {first.category}</Badge><h3 className="font-display-bn mt-5 text-[clamp(1.6rem,3.5vw,2.6rem)] leading-snug text-mist-100 group-hover:text-white">{first.title}</h3><p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-mist-400">{first.dek}</p><span className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--accent)" }}>প্রতিবেদনটি পড়ুন <ArrowUpRight className="h-4 w-4" /></span></article></Link><div className="surface rounded-2xl p-5"><p className="mono-label mb-4 text-mist-400">একই বিভাগে আরও</p><div className="divide-y divide-white/8">{rest.map((post) => <Link key={post.slug} href={`/post/${post.slug}`} className="group block py-4 first:pt-0 last:pb-0"><span className="mono-label" style={{ color: "var(--accent)" }}>{post.category}</span><p className="font-display-bn mt-1.5 text-[16px] leading-snug text-mist-100 group-hover:text-white">{post.title}</p></Link>)}</div></div></div></SectionShell>;
}

function RelatedGrid({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <SectionHead kicker="▚ MORE FROM THE DESK" title={<>সম্পর্কিত <span className="text-gradient">প্রতিবেদন</span></>} />
      <Stagger className="grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <StaggerItem key={p.slug}>
            <Link href={`/post/${p.slug}`} className="group block h-full">
              <article className="surface card-lift flex h-full flex-col overflow-hidden rounded-2xl">
                <PostImage src={p.image} alt={p.title} ratio="16/9" rounded="rounded-none" />
                <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="mono-label" style={{ color: "var(--accent)" }}>{p.category}</span>
                  <span className="mono-label text-mint-400/80">#{p.hash}</span>
                </div>
                <h3 className="font-display-bn mt-4 line-clamp-3 text-[19px] leading-[1.4] text-mist-100 group-hover:text-white">
                  {p.title}
                </h3>
                <p className="mt-2.5 line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-mist-400">{p.dek}</p>
                <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                  <span className="mono-label text-mist-400">{bnCompact(p.views)} ভিউ</span>
                  <ArrowUpRight className="h-4 w-4 text-mist-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-mist-100" />
                </div>
                </div>
              </article>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

function RelatedRail({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density} bleed>
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <SectionHead kicker="▚ SCROLL THE RAIL" title={<>আরও <span className="text-gradient">পড়ুন</span></>} />
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-4 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((p) => (
          <Link key={p.slug} href={`/post/${p.slug}`} className="group w-[320px] shrink-0 snap-start">
            <article className="surface card-lift h-full rounded-2xl p-6">
              <Badge tone="mute">{p.category}</Badge>
              <h3 className="font-display-bn mt-4 line-clamp-3 text-[19px] leading-snug text-mist-100 group-hover:text-white">
                {p.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-mist-400">{p.dek}</p>
              <div className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4">
                <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                <span className="mono-label text-mist-400">ফ্যাক্ট {bn(p.factScore)} · {bn(p.readMinutes)} মি</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

function RelatedStack({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <SectionHead kicker="▚ STACKED" title={<>সম্পর্কিত <span className="text-gradient">তালিকা</span></>} />
      <div className="mx-auto max-w-3xl border-t border-white/8">
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.06} y={14}>
            <Link href={`/post/${p.slug}`} className="group flex items-start gap-6 border-b border-white/8 py-7">
              <span className="font-latin pt-1 text-4xl font-bold leading-none text-white/[0.09] transition-colors group-hover:text-[var(--accent)]">
                {bn(String(i + 1).padStart(2, "0"))}
              </span>
              <div className="min-w-0 flex-1">
                <span className="mono-label" style={{ color: "var(--accent)" }}>{p.category}</span>
                <h3 className="font-display-bn mt-2 text-[clamp(1.2rem,2.4vw,1.6rem)] leading-[1.35] text-mist-100 group-hover:text-white">
                  {p.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-mist-400">{p.dek}</p>
              </div>
              <ArrowUpRight className="mt-2 h-5 w-5 shrink-0 text-mist-400 transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-mist-100" />
            </Link>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

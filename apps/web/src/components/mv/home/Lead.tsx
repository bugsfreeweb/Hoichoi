/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowUpRight, Hash, Quote, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Btn, LiveDot, SectionHead, SectionShell } from "@/components/mv/ui/primitives";
import PostImage from "@/components/mv/ui/PostImage";
import { CompareSlider, Reveal, Spotlight, Stagger, StaggerItem } from "@/components/mv/ui/motion";
import type { PostRecord } from "@/lib/mv/posts";
import { bn, bnCompact, timeAgo } from "@/lib/mv/format";

export default function Lead({
  variant,
  post,
  density,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "magazine") return <Magazine post={post} density={density} />;
  if (variant === "spotlight") return <SpotlightCard post={post} density={density} />;
  if (variant === "cover") return <LeadCover post={post} density={density} />;
  if (variant === "minimal") return <LeadMinimal post={post} density={density} />;
  return <Compare post={post} density={density} />;
}

function MetaRow({ post }: { post: PostRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Badge tone="hot">
        <LiveDot tone="hot" /> LEAD STORY
      </Badge>
      <span className="mono-label text-mist-400">{post.category}</span>
      <span className="mono-label text-mist-400/60">·</span>
      <span className="mono-label text-mist-400">SYNCED {timeAgo(post.publishedAt)}</span>
      <span className="mono-label text-mist-400/60">·</span>
      <span className="mono-label flex items-center gap-1.5 text-mint-400">
        <Hash className="h-3 w-3" /> {post.hash}
      </span>
    </div>
  );
}

/* ── variant 1 · compare slider (raw vs rewritten) ───────────────────────────── */
function Compare({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <SectionHead
        kicker="▚ REWRITE ENGINE · BANGLA STYLE GUIDE v2.4"
        title={<>একই ঘটনা — <span className="text-gradient">দুই জগত।</span></>}
        desc="বামে: ফিডের কাঁচা অবস্থা — হুটোপাটো ক্যাপশন, বানান-ভুল, আধমাথা তথ্য। ডানে: হৈচৈর ফ্যাক্ট-গেট পার হওয়া পুনর্লিখন। হাতলটি ধরে টেনে নিজেই বিচার করুন।"
        right={<Btn href={`/post/${post.slug}`}>সম্পূর্ণ প্রতিবেদন</Btn>}
      />

      <Reveal>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <CompareSlider
            className="min-h-[420px]"
            leftLabel="কাঁচা ফিড"
            rightLabel="পুনর্লিখিত"
            left={
              <div className="h-full min-h-[420px] bg-[#14100e] p-7">
                <p className="mono-label mb-4 text-gold-400">RAW · FACEBOOK POST</p>
                <p className="font-mono text-[14px] leading-relaxed text-mist-300/90">{post.rawFeed}</p>
                <div className="mt-8 space-y-2.5 border-t border-white/10 pt-5">
                  {[
                    { k: "বানান ভুল", v: "৪টি" },
                    { k: "সূত্র উল্লেখ", v: "নেই" },
                    { k: "সময় স্ট্যাম্প", v: "অস্পষ্ট" },
                  ].map((x) => (
                    <div key={x.k} className="flex items-center justify-between">
                      <span className="text-[13px] text-mist-400">{x.k}</span>
                      <span className="mono-label text-rose-400">{x.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            }
            right={
              <div className="h-full min-h-[420px] bg-ink-900 p-7">
                <p className="mono-label mb-4" style={{ color: "var(--accent)" }}>
                  REWRITTEN · FACT-GATE PASSED
                </p>
                <h3 className="font-display-bn text-[26px] leading-snug text-mist-100">{post.title}</h3>
                <p className="mt-4 text-[14.5px] leading-relaxed text-mist-300">{post.dek}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge tone="ok">
                    <ShieldCheck className="h-3 w-3" /> স্কোর {bn(post.factScore)}
                  </Badge>
                  <Badge tone="cool">{bn(post.readMinutes)} মিনিট পড়া</Badge>
                  <Badge tone="mute">{bnCompact(post.views)} ভিউ</Badge>
                </div>
                <Link
                  href={`/post/${post.slug}`}
                  className="group mt-7 inline-flex items-center gap-2 text-[14px] font-semibold text-mist-100"
                >
                  পুরো লেখা পড়ুন
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            }
          />

          <div className="surface-hi flex flex-col justify-between rounded-2xl p-6">
            <div>
              <p className="mono-label text-mist-400">REWRITE DIFF</p>
              <h3 className="font-display-bn mt-3 text-2xl leading-snug text-mist-100">
                হাতলটি ধরে টেনে তুলনা করুন
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
                ⟵ বাম দিকে কাঁচা ফিড, ডান দিকে পুনর্লিখিত সংস্করণ ⟶। প্রতিটি রিরাইটে সংখ্যা, নাম ও সময় আলাদাভাবে
                যাচাই করা হয়।
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { k: "শব্দ সংখ্যা বৃদ্ধি", v: "+৩১২%", tone: "ok" as const },
                { k: "উদ্ধৃতি যোগ", v: "২টি", tone: "cool" as const },
                { k: "অযাচাইত দাবি বাদ", v: "৩টি", tone: "warn" as const },
              ].map((x) => (
                <div key={x.k} className="flex items-center justify-between rounded-lg border border-white/8 px-3 py-2.5">
                  <span className="text-[13px] text-mist-300">{x.k}</span>
                  <Badge tone={x.tone}>{x.v}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 2 · magazine spread ───────────────────────────── */
function Magazine({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const firstPara = String((post.body[0] as { text?: string })?.text ?? "");
  return (
    <SectionShell density={density}>
      <Reveal>
        <article className="relative overflow-hidden rounded-3xl border border-white/8 bg-ink-900/50">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative order-2 p-8 md:p-12 lg:order-1">
              <MetaRow post={post} />
              <h2 className="font-display-bn mt-7 text-[clamp(1.9rem,4.2vw,3.2rem)] leading-[1.18] text-mist-100">
                {post.title}
              </h2>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-mist-300">{post.dek}</p>

              <div className="my-8 flex items-center gap-4">
                <span className="h-px flex-1 bg-white/10" />
                <Quote className="h-4 w-4" style={{ color: "var(--accent)" }} />
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <p className="font-display-bn text-[19px] leading-[1.85] text-mist-200">
                <span className="float-left mr-3 font-latin text-[3.4rem] font-bold leading-[0.8]" style={{ color: "var(--accent)" }}>
                  {firstPara.slice(0, 1)}
                </span>
                {firstPara.slice(1)}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Btn href={`/post/${post.slug}`}>সম্পূর্ণ প্রতিবেদন</Btn>
                <span className="mono-label text-mist-400">{bn(post.readMinutes)} মিনিট পড়া</span>
              </div>
            </div>

            <div className="relative order-1 min-h-[320px] lg:order-2">
              <img src={post.image} alt={post.title} className="ken-burns absolute inset-0 h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/12 bg-white/12">
                  {[
                    { k: "ভিউ", v: post.views },
                    { k: "শেয়ার", v: post.shares },
                    { k: "মন্তব্য", v: post.comments },
                  ].map((s) => (
                    <div key={s.k} className="bg-ink-950/88 px-3 py-4 text-center backdrop-blur">
                      <p className="font-latin text-xl font-bold text-mist-100">{bnCompact(s.v)}</p>
                      <p className="mono-label mt-1 text-mist-400">{s.k}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 3 · spotlight card ───────────────────────────── */
function SpotlightCard({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <SectionHead
        kicker="▚ SPOTLIGHT · AUTO-FEATURED"
        title={<>আজকের <span className="text-gradient">প্রধান হৈচৈ</span></>}
        desc="সবচেয়ে বেশি এনগেজমেন্ট পাওয়া, ফ্যাক্ট-গেট পার হওয়া প্রতিবেদনটি স্বয়ংক্রিয়ভাবে এখানে উঠে আসে।"
      />
      <Reveal>
        <Spotlight radius={420}>
          <div className="surface-hi relative overflow-hidden rounded-3xl">
            <div className="grid lg:grid-cols-[1fr_0.72fr]">
              <div className="p-8 md:p-12">
                <MetaRow post={post} />
                <h3 className="font-display-bn mt-6 text-[clamp(1.8rem,3.8vw,2.9rem)] leading-[1.2] text-mist-100">
                  {post.title}
                </h3>
                <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-mist-300">{post.dek}</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Btn href={`/post/${post.slug}`}>
                    <Sparkles className="h-4 w-4" /> এখনই পড়ুন
                  </Btn>
                  <Btn href="/#latest" variant="outline">
                    বাকি সংগ্রহ
                  </Btn>
                </div>
                <div className="mt-9 flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <span key={t} className="mono-label rounded-full border border-white/10 px-2.5 py-1 text-mist-400 transition-colors hover:border-white/25 hover:text-mist-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[260px] border-t border-white/8 lg:border-l lg:border-t-0">
                <div className="absolute inset-0 grid-bg opacity-40" />
                <Stagger className="relative flex h-full flex-col justify-center gap-3 p-8">
                  {[
                    { k: "ফ্যাক্ট-গেট স্কোর", v: `${bn(post.factScore)}/১০০`, tone: "#4ade80" },
                    { k: "পৌঁছানো পাঠক", v: bnCompact(Number((post.metrics as { reach?: number }).reach ?? post.views * 4)), tone: "#f5a524" },
                    { k: "ক্লিক-থ্রু রেট", v: `${bn(Number((post.metrics as { ctr?: number }).ctr ?? 6))}%`, tone: "#56c8ff" },
                    { k: "পড়ে শেষ করেছে", v: `${bn(Number((post.metrics as { readPct?: number }).readPct ?? 55))}%`, tone: "#a78bfa" },
                  ].map((s) => (
                    <StaggerItem key={s.k}>
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                        <span className="text-[13.5px] text-mist-300">{s.k}</span>
                        <span className="font-latin text-lg font-bold" style={{ color: s.tone }}>
                          {s.v}
                        </span>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </div>
          </div>
        </Spotlight>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 4 · full-bleed banner cover ───────────────────────────── */
function LeadCover({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <Reveal>
        <div className="relative min-h-[380px] overflow-hidden rounded-3xl border border-white/12 p-8 md:min-h-[440px] md:p-14">
          <img src={post.image} alt={post.title} className="ken-burns absolute inset-0 h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/20" />
          <div className="relative flex h-full min-h-[300px] flex-col justify-end max-w-4xl">
            <MetaRow post={post} />
            <h3 className="font-display-bn mt-4 text-[clamp(1.8rem,4.2vw,3rem)] leading-snug text-mist-100">
              {post.title}
            </h3>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mist-300">
              {post.dek}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Btn href={`/post/${post.slug}`}>সম্পূর্ণ খবর পড়ুন</Btn>
              <span className="mono-label text-mint-400">ফ্যাক্ট স্কোর {bn(post.factScore)}/১০০</span>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 5 · minimal wire summary ───────────────────────────── */
function LeadMinimal({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density}>
      <Reveal>
        <div className="surface mx-auto max-w-4xl rounded-2xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
            <MetaRow post={post} />
            <span className="mono-label text-mint-400">যাচাইকৃত সংস্করণ</span>
          </div>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row">
            <PostImage src={post.image} alt={post.title} ratio="4/3" className="w-full shrink-0 sm:w-48" />
            <div>
          <h3 className="font-display-bn text-2xl md:text-3xl text-mist-100">
            {post.title}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-mist-300">
            {post.dek}
          </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-4">
            <span className="mono-label text-mist-400">{timeAgo(post.publishedAt)} · {bn(post.readMinutes)} মিনিট পাঠ</span>
            <Btn href={`/post/${post.slug}`}>বিস্তারিত খবর</Btn>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

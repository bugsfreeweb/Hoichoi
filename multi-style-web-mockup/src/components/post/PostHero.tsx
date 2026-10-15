/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  Hash,
  Link2,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserRound,
  X,
} from "lucide-react";
import { Badge, Btn, LiveDot, SectionShell } from "@/components/ui/primitives";
import PostImage from "@/components/ui/PostImage";
import { imageCaption } from "@/lib/images";
import { CountUp, Reveal, Scramble } from "@/components/ui/motion";
import type { PostRecord } from "@/lib/posts";
import { bn, bnCompact, bnDate, bnTime, timeAgo } from "@/lib/format";

/** Inline brand glyph (lucide no longer ships brand icons). */
function Facebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H8v3h2.3V21h3.2Z" />
    </svg>
  );
}

/* ══════════════════ POST HERO ══════════════════ */
export function PostHero({
  variant,
  post,
  density,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "cinema") return <CinemaCover post={post} />;
  if (variant === "compact") return <CompactTerminal post={post} density={density} />;
  if (variant === "cover") return <FeatureCover post={post} density={density} />;
  if (variant === "center") return <CenteredHeadline post={post} density={density} />;
  return <EditorialDoc post={post} density={density} />;
}

function Breadcrumb({ post }: { post: PostRecord }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[12.5px] text-mist-400">
      <Link href="/" className="transition-colors hover:text-mist-100">
        হোম
      </Link>
      <span className="text-mist-400/40">/</span>
      <Link href="/#latest" className="transition-colors hover:text-mist-100">
        সংগ্রহ
      </Link>
      <span className="text-mist-400/40">/</span>
      <span className="mono-label" style={{ color: "var(--accent)" }}>
        {post.category}
      </span>
    </nav>
  );
}

function MetaList({ post, className }: { post: PostRecord; className?: string }) {
  const items = [
    { Icon: UserRound, k: post.author },
    { Icon: MapPin, k: post.location },
    { Icon: Clock3, k: `${bn(post.readMinutes)} মিনিট পড়া` },
    { Icon: Eye, k: `${bnCompact(post.views)} ভিউ` },
  ];
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      {items.map(({ Icon, k }, i) => (
        <span key={i} className="flex items-center gap-1.5 text-[13px] text-mist-400">
          <Icon className="h-3.5 w-3.5" /> {k}
        </span>
      ))}
    </div>
  );
}

/* ── variant 1 · editorial doc ───────────────────────────── */
function EditorialDoc({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density} className="!pt-12 md:!pt-16">
      <div className="mx-auto max-w-[900px] text-center">
        <Reveal y={18}>
          <div className="mb-6 flex justify-center">
            <Breadcrumb post={post} />
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="hot">
              <LiveDot tone="hot" /> {post.category}
            </Badge>
            <Badge tone="ok">
              <ShieldCheck className="h-3 w-3" /> ফ্যাক্ট-গেট {bn(post.factScore)}
            </Badge>
            <Badge tone="mute">
              <Hash className="h-3 w-3" /> {post.hash}
            </Badge>
          </div>
          <h1 className="font-display-bn text-[clamp(1.9rem,5vw,3.4rem)] leading-[1.22] text-mist-100">
            {post.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16.5px] leading-relaxed text-mist-300">{post.dek}</p>
          <div className="my-8 flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-white/12" />
            <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <span className="h-px w-16 bg-white/12" />
          </div>
          <MetaList post={post} className="justify-center" />
          <p className="mono-label mt-3 text-mist-400">
            {bnDate(post.publishedAt)} · {bnTime(post.publishedAt)} · {timeAgo(post.publishedAt)}
          </p>

          <figure className="group mt-10 text-left">
            <PostImage src={post.image} alt={post.title} ratio="16/8" rounded="rounded-2xl" />
            <figcaption className="mt-2.5 text-center text-[12px] text-mist-400">
              {imageCaption(post.source)}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ── variant 2 · cinematic cover ───────────────────────────── */
function CinemaCover({ post }: { post: PostRecord }) {
  return (
    <section className="relative min-h-[76vh] overflow-hidden">
      <img src={post.image} alt={post.title} className="ken-burns absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/72 to-ink-950/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-transparent to-transparent" />

      <div className="relative mx-auto flex min-h-[76vh] max-w-[1320px] flex-col justify-end px-5 pb-14 pt-36 md:px-8">
        <Reveal y={24}>
          <Link href="/" className="mono-label mb-6 inline-flex items-center gap-2 text-mist-300 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> হোমে ফিরুন
          </Link>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge tone="hot">
              <LiveDot tone="hot" /> {post.category}
            </Badge>
            <Badge tone="ok">
              <ShieldCheck className="h-3 w-3" /> যাচাইকৃত
            </Badge>
            <Badge tone="mute">
              <Hash className="h-3 w-3" /> {post.hash}
            </Badge>
            <Badge tone="cool">{bn(post.readMinutes)} মিনিট</Badge>
          </div>
          <h1 className="font-display-bn max-w-4xl text-[clamp(2rem,5.6vw,4rem)] leading-[1.12] text-mist-100">
            <Scramble text={post.title.length > 68 ? `${post.title.slice(0, 68)}…` : post.title} speed={22} />
          </h1>
          <p className="mt-6 max-w-2xl text-[16.5px] leading-relaxed text-mist-300">{post.dek}</p>
          <div className="mt-9 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "ভিউ", v: post.views },
              { k: "শেয়ার", v: post.shares },
              { k: "মন্তব্য", v: post.comments },
              { k: "ফ্যাক্ট স্কোর", v: post.factScore },
            ].map((s) => (
              <div key={s.k} className="bg-ink-950/85 px-5 py-4 backdrop-blur">
                <p className="font-latin text-2xl font-bold text-mist-100">
                  <CountUp value={s.v} />
                </p>
                <p className="mono-label mt-1 text-mist-400">{s.k}</p>
              </div>
            ))}
          </div>
          <MetaList post={post} className="mt-7" />
        </Reveal>
      </div>
    </section>
  );
}

/* ── variant 3 · compact terminal ───────────────────────────── */
function CompactTerminal({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density} className="!pt-10">
      <div className="surface-hi overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/8 bg-ink-950/70 px-4 py-2.5">
          <Terminal className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span className="mono-label truncate text-mist-400">content/{post.categorySlug}/{post.slug}.json</span>
          <span className="mono-label ml-auto flex items-center gap-2 text-mint-400">
            <LiveDot /> PUBLISHED
          </span>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1.5fr_1fr] md:p-8">
          <div>
            <Breadcrumb post={post} />
            <h1 className="font-display-bn mt-4 text-[clamp(1.5rem,3.4vw,2.4rem)] leading-[1.28] text-mist-100">
              {post.title}
            </h1>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-mist-400">{post.dek}</p>
          </div>
          <div className="font-mono text-[12px] leading-relaxed text-mist-400">
            <pre className="overflow-x-auto rounded-xl border border-white/8 bg-ink-950/60 p-4">
{`{
  "slug": "${post.slug}",
  "hash": "${post.hash}",
  "category": "${post.categorySlug}",
  "fact_score": ${post.factScore},
  "read_minutes": ${post.readMinutes},
  "views": ${post.views},
  "source": "${post.source}"
}`}
            </pre>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function FeatureCover({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density} className="!pt-10">
      <Reveal>
        <div className="surface-hi relative min-h-[340px] overflow-hidden rounded-3xl p-7 md:min-h-[420px] md:p-12">
          <img src={post.image} alt={post.title} className="ken-burns absolute inset-0 h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/75 to-ink-950/15" />
          <div className="relative flex h-full min-h-[280px] max-w-4xl flex-col justify-end">
            <Breadcrumb post={post} />
            <div className="mt-5 flex flex-wrap gap-2"><Badge tone="hot">{post.category}</Badge><Badge tone="ok"><ShieldCheck className="h-3 w-3" />যাচাই {bn(post.factScore)}</Badge></div>
            <h1 className="font-display-bn mt-5 text-[clamp(1.9rem,4.7vw,3.5rem)] leading-[1.18] text-mist-100">{post.title}</h1>
            <p className="mt-4 max-w-3xl text-[15.5px] leading-relaxed text-mist-300">{post.dek}</p>
            <MetaList post={post} className="mt-6" />
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function CenteredHeadline({ post, density }: { post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell density={density} className="!pt-14 md:!pt-20">
      <Reveal y={18}>
        <div className="mx-auto max-w-[850px] text-center">
          <div className="mb-5 flex justify-center"><Breadcrumb post={post} /></div>
          <span className="mono-label" style={{ color: "var(--accent)" }}>হৈচৈ সম্পাদকীয় ডেস্ক · {post.category}</span>
          <h1 className="font-display-bn mt-5 text-[clamp(2rem,5.3vw,3.8rem)] leading-[1.2] text-mist-100">{post.title}</h1>
          <div className="mx-auto my-6 h-[2px] w-20 rounded-full" style={{ background: "var(--accent)" }} />
          <p className="mx-auto max-w-2xl text-[16px] leading-relaxed text-mist-300">{post.dek}</p>
          <MetaList post={post} className="mt-7 justify-center" />
          <p className="mono-label mt-4 text-mist-400">প্রকাশিত · {bnDate(post.publishedAt)} · পরিচিতি {post.hash}</p>
          <figure className="group mt-9">
            <PostImage src={post.image} alt={post.title} ratio="21/9" rounded="rounded-2xl" />
            <figcaption className="mt-2.5 text-[12px] text-mist-400">{imageCaption(post.source)}</figcaption>
          </figure>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ══════════════════ FACT-GATE BAR ══════════════════ */
export function PostFactbar({ variant, post }: { variant: string; post: PostRecord }) {
  if (variant === "card") return <FactCard post={post} />;
  if (variant === "chips") return <BylineChips post={post} />;
  if (variant === "bar") return <FactProgress post={post} />;
  if (variant === "audit") return <FactAudit post={post} />;
  return <TrustMeter post={post} />;
}

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-latin text-xl font-bold text-mist-100">
          <CountUp value={score} />
        </p>
        <p className="mono-label text-mist-400">SCORE</p>
      </div>
    </div>
  );
}

function FactProgress({ post }: { post: PostRecord }) {
  const stages = ["উৎস শনাক্ত", "নাম-তারিখ মিল", "পুনরাবৃত্তি যাচাই", "তথ্য পুনর্লিখন", "সম্পাদকীয় পর্যালোচনা"];
  return (
    <SectionShell density="compact" className="!py-6">
      <Reveal y={12}>
        <div className="surface rounded-2xl p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-3"><ScoreRing score={post.factScore} size={72} /><div><p className="mono-label text-mist-400">যাচাইয়ের আস্থা</p><p className="font-display-bn mt-1 text-lg text-mist-100">{post.factScore >= 90 ? "উচ্চ আস্থা" : "সম্পাদকীয়ভাবে পর্যালোচিত"}</p></div></div>
            <div className="ml-auto flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-mint-400" /><span className="mono-label text-mint-400">{post.hash}</span></div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {stages.map((stage, i) => <div key={stage}><div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: i < 4 || post.factScore >= 88 ? "100%" : "64%", background: i === 4 ? "var(--accent)" : "#4ade80" }} /></div><p className="text-[11px] leading-snug text-mist-400">{stage}</p></div>)}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function FactAudit({ post }: { post: PostRecord }) {
  return (
    <SectionShell density="compact" className="!py-6">
      <Reveal>
        <div className="surface-hi mx-auto grid max-w-5xl gap-5 rounded-2xl p-5 md:grid-cols-[auto_1fr_0.8fr] md:items-center md:p-7">
          <ScoreRing score={post.factScore} size={84} />
          <div><p className="mono-label text-mist-400">সম্পাদকীয় যাচাই-নথি</p><h3 className="font-display-bn mt-2 text-xl text-mist-100">মূল উৎস ও দাবির মিল পরীক্ষা করা হয়েছে</h3><p className="mt-1 text-[13px] text-mist-400">{post.source} · {post.author} · {post.location}</p></div>
          <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/8 p-3"><p className="mono-label text-mist-400">সূত্র-চিহ্ন</p><p className="font-mono mt-1 text-[13px] text-mint-400">{post.hash}</p></div><div className="rounded-lg border border-white/8 p-3"><p className="mono-label text-mist-400">পড়ার সময়</p><p className="mt-1 text-[13px] text-mist-100">{bn(post.readMinutes)} মিনিট</p></div></div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 1 · trust meter ───────────────────────────── */
function TrustMeter({ post }: { post: PostRecord }) {
  const checks = [
    { k: "সূত্র শনাক্ত", ok: true },
    { k: "সংখ্যা যাচাই", ok: true },
    { k: "ডুপ্লিকেট গেট", ok: true },
    { k: "মানুষের রিভিউ", ok: post.factScore >= 85 },
    { k: "উদ্ধৃতি মিলিয়ে দেখা", ok: post.factScore >= 88 },
  ];
  return (
    <SectionShell density="compact" className="!py-6">
      <Reveal y={16}>
        <div className="surface-hi grid gap-6 rounded-2xl p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-7">
          <div className="flex items-center gap-4">
            <ScoreRing score={post.factScore} />
            <div>
              <p className="mono-label text-mist-400">FACT-GATE</p>
              <p className="font-display-bn mt-1 text-xl text-mist-100">
                {post.factScore >= 90 ? "উচ্চ আস্থা" : post.factScore >= 84 ? "মধ্যম আস্থা" : "সীমিত আস্থা"}
              </p>
              <p className="mt-1 text-[12.5px] text-mist-400">থ্রেশহোল্ড ০.৯০ · Bangla style guide v2.4</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {checks.map((c) => (
              <span
                key={c.k}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                  c.ok ? "border-mint-500/30 bg-mint-500/10 text-mint-400" : "border-gold-500/30 bg-gold-500/10 text-gold-400",
                )}
              >
                {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {c.k}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <span className="mono-label text-mist-400">SOURCE</span>
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 text-[14px] font-semibold text-mist-100 transition-colors hover:text-white"
            >
              <Link2 className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              {post.source}
            </a>
            <span className="mono-label text-mist-400">SHA · {post.hash}</span>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ── variant 2 · fact card ───────────────────────────── */
function FactCard({ post }: { post: PostRecord }) {
  const cards = [
    { k: "সূত্র", v: post.source, sub: "ফেসবুক পেজ", Icon: Link2, color: "#56c8ff" },
    { k: "লেখক", v: post.author, sub: "মূল পোস্ট", Icon: UserRound, color: "#a78bfa" },
    { k: "কনটেন্ট হ্যাশ", v: post.hash, sub: "SHA-256 · SimHash পাস", Icon: Hash, color: "#4ade80" },
    { k: "LLM কনফিডেন্স", v: `${bn(post.factScore)}%`, sub: "থ্রেশহোল্ড ০.৯০", Icon: Sparkles, color: "#f5a524" },
    { k: "প্রকাশ", v: bnTime(post.publishedAt), sub: bnDate(post.publishedAt), Icon: Clock3, color: "#ff5c38" },
    { k: "পড়া", v: `${bn(post.readMinutes)} মিনিট`, sub: `${bnCompact(post.views)} ভিউ`, Icon: Eye, color: "#22a7e6" },
  ];
  return (
    <SectionShell density="compact" className="!py-6">
      <StaggerGrid>
        {cards.map((c) => (
          <div key={c.k} className="surface card-lift group relative overflow-hidden rounded-xl p-5">
            <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${c.color}18`, color: c.color }}>
              <c.Icon className="h-4 w-4" />
            </span>
            <p className="mono-label mt-4 text-mist-400">{c.k}</p>
            <p className="mt-1 truncate text-[15px] font-semibold text-mist-100">{c.v}</p>
            <p className="mt-0.5 text-[12px] text-mist-400">{c.sub}</p>
          </div>
        ))}
      </StaggerGrid>
    </SectionShell>
  );
}

function StaggerGrid({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </Reveal>
  );
}

/* ── variant 3 · byline chips ───────────────────────────── */
function BylineChips({ post }: { post: PostRecord }) {
  return (
    <SectionShell density="compact" className="!py-5">
      <Reveal y={12}>
        <div className="mask-fade-r flex items-center gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { Icon: ShieldCheck, k: `ফ্যাক্ট ${bn(post.factScore)}`, tone: "ok" },
            { Icon: Hash, k: post.hash, tone: "cool" },
            { Icon: UserRound, k: post.author, tone: "mute" },
            { Icon: MapPin, k: post.location, tone: "mute" },
            { Icon: Clock3, k: `${bn(post.readMinutes)} মিনিট`, tone: "warn" },
            { Icon: Eye, k: bnCompact(post.views), tone: "mute" },
            { Icon: MessageCircle, k: bnCompact(post.comments), tone: "mute" },
            { Icon: Link2, k: post.source, tone: "hot" },
          ].map((c, i) => (
            <span
              key={i}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12.5px] text-mist-300 transition-all hover:-translate-y-0.5 hover:border-white/25 hover:text-mist-100"
            >
              <c.Icon className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              {c.k}
            </span>
          ))}
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ══════════════════ SHARE ══════════════════ */
export function ShareRail({ post, title, variant = "rail" }: { post: PostRecord; title: string; variant?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(`${typeof window !== "undefined" ? window.location.origin : ""}/post/${post.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const items = [
    { Icon: Facebook, label: "শেয়ার", onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`, "_blank") },
    { Icon: Link2, label: copied ? "কপি হয়েছে" : "লিংক কপি", onClick: copy },
    { Icon: MessageCircle, label: `মন্তব্য ${bn(post.comments)}`, onClick: () => document.getElementById("post-comments")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
  ];
  return (
    <>
      <div
        className={clsx(
          "z-40 flex gap-2",
          variant === "sticky"
            ? "fixed inset-x-0 bottom-0 items-center justify-center border-t border-white/10 bg-ink-950/90 px-4 py-3 backdrop-blur-xl"
            : variant === "floating"
              ? "fixed bottom-24 right-5 flex-col rounded-2xl border border-white/10 bg-ink-950/75 p-2 shadow-xl backdrop-blur-xl"
              : "fixed left-4 top-1/2 hidden -translate-y-1/2 flex-col xl:flex",
        )}
      >
        {variant === "sticky" ? <span className="hidden text-[12px] font-medium text-mist-300 sm:inline">প্রতিবেদনটি ভাগ করুন</span> : null}
        {items.map(({ Icon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={clsx(
              "surface group grid place-items-center text-mist-300 transition-all hover:-translate-y-0.5 hover:text-mist-100",
              variant === "sticky" ? "h-10 w-10 rounded-full" : variant === "floating" ? "h-10 w-10 rounded-full" : "h-11 w-11 rounded-xl",
            )}
            title={label}
            aria-label={label}
          >
            <Icon className="h-4 w-4 transition-colors group-hover:text-[var(--accent)]" />
          </button>
        ))}
        {variant === "rail" ? <div className="surface mt-2 flex h-20 w-11 flex-col items-center justify-center gap-1 rounded-xl"><Share2 className="h-3.5 w-3.5 text-mist-400" /><span className="mono-label text-mist-400">ভাগ</span></div> : null}
      </div>
      <span className="sr-only">{title}</span>
    </>
  );
}

export function ShareBar({ post, variant = "bar" }: { post: PostRecord; variant?: string }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const [reacted, setReacted] = useState<string | null>(null);
  return (
    <Reveal>
      <div className={clsx("surface flex flex-col gap-5 rounded-2xl p-6 md:flex-row md:items-center md:justify-between", variant === "compact" && "gap-3 !p-4 md:!p-4")}>
        <div>
          <p className="mono-label text-mist-400">প্রতিবেদনটি কেমন লাগল?</p>
          <div className="mt-3 flex items-center gap-2">
            {[
              { id: "up", label: "তথ্যবহুল", emoji: "📌" },
              { id: "care", label: "গুরুত্বপূর্ণ", emoji: "🔥" },
              { id: "doubt", label: "সন্দেহ আছে", emoji: "🤔" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setReacted(r.id)}
                className={clsx(
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] transition-all",
                  reacted === r.id ? "border-transparent text-ink-950" : "border-white/12 text-mist-300 hover:border-white/30 hover:text-mist-100",
                )}
                style={reacted === r.id ? { background: "var(--accent)" } : undefined}
              >
                <span>{r.emoji}</span> {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${origin}/post/${post.slug}`)}`}
            variant="outline"
            icon={false}
          >
            <Facebook className="h-4 w-4" /> ফেসবুকে শেয়ার
          </Btn>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(`${typeof window !== "undefined" ? window.location.origin : ""}/post/${post.slug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="flex items-center gap-2 rounded-full border border-white/12 px-4 py-2.5 text-[14px] font-semibold text-mist-100 transition-all hover:border-white/30 hover:bg-white/5"
          >
            {copied ? <Check className="h-4 w-4 text-mint-400" /> : <Link2 className="h-4 w-4" />}
            {copied ? "কপি হয়েছে" : "লিংক কপি"}
          </button>
          <span className="mono-label ml-1 text-mist-400">
            <Share2 className="mr-1 inline h-3 w-3" /> {bnCompact(post.shares)} শেয়ার
          </span>
        </div>
      </div>
    </Reveal>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, Hash, MessageCircle, Share2, Eye } from "lucide-react";
import { Badge, Btn, LiveDot, SectionHead, SectionShell } from "@/components/mv/ui/primitives";
import PostImage from "@/components/mv/ui/PostImage";
import { Reveal, Stagger, StaggerItem } from "@/components/mv/ui/motion";
import type { PostRecord } from "@/lib/mv/posts";
import { bn, bnCompact, timeAgo } from "@/lib/mv/format";

export default function Latest({
  variant,
  posts,
  density,
}: {
  variant: string;
  posts: PostRecord[];
  density: "compact" | "comfortable" | "spacious";
}) {
  if (variant === "list") return <EditorialList posts={posts} density={density} />;
  if (variant === "masonry") return <Masonry posts={posts} density={density} />;
  if (variant === "rail") return <Rail posts={posts} density={density} />;
  if (variant === "featured") return <FeaturedSplit posts={posts} density={density} />;
  return <Grid posts={posts} density={density} />;
}

function PostStats({ post, className }: { post: PostRecord; className?: string }) {
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      <span className="mono-label flex items-center gap-1.5 text-mist-400">
        <Eye className="h-3 w-3" /> {bnCompact(post.views)}
      </span>
      <span className="mono-label flex items-center gap-1.5 text-mist-400">
        <Share2 className="h-3 w-3" /> {bnCompact(post.shares)}
      </span>
      <span className="mono-label flex items-center gap-1.5 text-mist-400">
        <MessageCircle className="h-3 w-3" /> {bnCompact(post.comments)}
      </span>
      <span className="mono-label flex items-center gap-1.5 text-mist-400">
        <Clock3 className="h-3 w-3" /> {bn(post.readMinutes)} মি
      </span>
    </div>
  );
}

function HashStamp({ post }: { post: PostRecord }) {
  return (
    <span className="mono-label flex items-center gap-1.5 text-mint-400/85">
      <Hash className="h-3 w-3" /> {post.hash}
    </span>
  );
}

/* ── variant 1 · grid cards ───────────────────────────── */
function Grid({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="latest" density={density}>
      <SectionHead
        kicker="▚ TODAY'S COLLECTION · AUTO-CURATED"
        title={<>আজকের <span className="text-gradient">সংগ্রহ</span></>}
        desc="প্রতিটি কার্ডের হ্যাশ স্ট্যাম্প দেখুন — এটাই এর জন্মসনদ। একই খবর দুইবার এখানে জায়গা পায় না; পায় শুধু যাচাই করা, পুনর্লিখিত সংস্করণ।"
        right={
          <div className="flex items-center gap-2">
            <Badge tone="ok">
              <LiveDot /> AUTO-CATEGORIZED BY LLM
            </Badge>
          </div>
        }
      />
      <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <StaggerItem key={p.slug}>
            <Link href={`/post/${p.slug}`} className="group block h-full">
              <article className="surface card-lift relative flex h-full flex-col overflow-hidden rounded-2xl">
                <PostImage src={p.image} alt={p.title} ratio="16/9" rounded="rounded-none" scrim>
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                    <Badge tone={p.factScore >= 88 ? "ok" : p.factScore >= 82 ? "warn" : "cool"}>
                      ফ্যাক্ট {bn(p.factScore)}
                    </Badge>
                    <HashStamp post={p} />
                  </span>
                </PostImage>
                <div className="flex flex-1 flex-col p-6">
                <p className="mono-label" style={{ color: "var(--accent)" }}>
                  {p.category}
                </p>
                <h3 className="font-display-bn mt-2.5 line-clamp-3 text-[21px] leading-[1.4] text-mist-100 transition-colors group-hover:text-white">
                  {p.title}
                </h3>
                <p className="mt-3 line-clamp-3 flex-1 text-[13.5px] leading-relaxed text-mist-400">{p.dek}</p>
                <div className="mt-5 border-t border-white/8 pt-4">
                  <PostStats post={p} />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="mono-label text-mist-400">{timeAgo(p.publishedAt)}</span>
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-mist-300 transition-all duration-400 group-hover:border-transparent group-hover:text-ink-950" style={{ boxShadow: "none" }}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
                </div>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: "linear-gradient(90deg, var(--accent), #f5a524)" }}
                />
              </article>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

/* ── variant 2 · editorial list ───────────────────────────── */
function EditorialList({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  return (
    <SectionShell id="latest" density={density}>
      <SectionHead
        kicker="▚ EDITORIAL INDEX"
        title={<>সর্বশেষ <span className="text-gradient">নথিভুক্ত তালিকা</span></>}
        desc="প্রতিটি সারি একটি প্রতিবেদন — নম্বর, শিরোনাম, ক্যাটাগরি ও যাচাই স্কোর একসঙ্গে।"
      />
      <div className="border-t border-white/8">
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.04} y={14}>
            <Link href={`/post/${p.slug}`} className="group grid grid-cols-[auto_1fr] items-start gap-5 border-b border-white/8 py-6 transition-colors hover:bg-white/[0.02] md:grid-cols-[auto_1.6fr_1fr_auto] md:gap-8 md:py-7">
              <span className="font-latin pt-1 text-[13px] font-semibold text-mist-400/60 transition-colors group-hover:text-mist-200">
                {bn(String(i + 1).padStart(2, "0"))}
              </span>
              <div className="flex gap-4">
                <PostImage
                  src={p.image}
                  alt={p.title}
                  ratio="1/1"
                  className="hidden w-24 shrink-0 sm:block"
                />
                <div>
                  <p className="mono-label mb-2" style={{ color: "var(--accent)" }}>
                    {p.category} · {timeAgo(p.publishedAt)}
                  </p>
                  <h3 className="font-display-bn text-[clamp(1.25rem,2.4vw,1.7rem)] leading-[1.35] text-mist-100 transition-colors group-hover:text-white">
                    {p.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 max-w-2xl text-[13.5px] leading-relaxed text-mist-400">{p.dek}</p>
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <PostStats post={p} className="mb-3" />
                <HashStamp post={p} />
              </div>
              <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-mist-300 transition-all duration-400 group-hover:rotate-45 md:grid" style={{ background: "transparent" }}>
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── variant 3 · masonry mosaic ───────────────────────────── */
function Masonry({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  const cols = [[], [], []] as PostRecord[][];
  posts.forEach((p, i) => cols[i % 3]?.push(p));
  return (
    <SectionShell id="latest" density={density}>
      <SectionHead
        kicker="▚ MOSAIC · AUTO-CURATED"
        title={<>সংগ্রহের <span className="text-gradient">মোজাইক</span></>}
        desc="অসম উচ্চতার কার্ড — চোখ যেখানে খুশি আটকাক।"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-4">
            {col.map((p, i) => {
              const big = ci === 0 && i === 0;
              return (
                <Reveal key={p.slug} delay={(ci * 3 + i) * 0.05}>
                  <Link href={`/post/${p.slug}`} className="group block">
                    <article
                      className={clsx(
                        "surface card-lift relative flex flex-col justify-between overflow-hidden rounded-2xl border-white/8",
                        big ? "min-h-[420px] p-7" : "min-h-[240px] p-6",
                      )}
                    >
                      <div
                        aria-hidden
                        className={clsx("absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100", big && "opacity-100")}
                        style={{ background: `radial-gradient(120% 90% at 100% 0%, ${big ? "var(--accent)" : "#f5a524"}1f, transparent 60%)` }}
                      />
                      <div className="relative">
                        <PostImage
                          src={p.image}
                          alt={p.title}
                          ratio={big ? "16/10" : "16/9"}
                          className="mb-5"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <span className="mono-label" style={{ color: big ? "var(--accent)" : "#f5a524" }}>
                            {p.category}
                          </span>
                          <HashStamp post={p} />
                        </div>
                        <h3
                          className={clsx(
                            "font-display-bn mt-4 leading-[1.3] text-mist-100 transition-colors group-hover:text-white",
                            big ? "text-[clamp(1.6rem,3vw,2.3rem)]" : "line-clamp-3 text-[19px]",
                          )}
                        >
                          {p.title}
                        </h3>
                        <p className={clsx("mt-3 leading-relaxed text-mist-400", big ? "text-[14.5px]" : "line-clamp-2 text-[13px]")}>
                          {p.dek}
                        </p>
                      </div>
                      <div className="relative mt-6 flex items-center justify-between border-t border-white/8 pt-4">
                        <span className="mono-label text-mist-400">{timeAgo(p.publishedAt)}</span>
                        <span className="mono-label flex items-center gap-1.5 text-mist-300">
                          <Eye className="h-3 w-3" /> {bnCompact(p.views)}
                        </span>
                      </div>
                    </article>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── variant 4 · horizontal rail ───────────────────────────── */
function Rail({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress(max > 0 ? (el.scrollLeft / max) * 100 : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const nudge = (dir: number) => ref.current?.scrollBy({ left: dir * 380, behavior: "smooth" });

  return (
    <SectionShell id="latest" density={density} bleed>
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <SectionHead
          kicker="▚ COLLECTION RAIL"
          title={<>সংগ্রহের <span className="text-gradient">রেইল</span></>}
          desc="পাশে স্ক্রল করুন অথবা তীর চিহ্ন ব্যবহার করুন।"
          right={
            <div className="flex items-center gap-2">
              <button onClick={() => nudge(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-mist-200 transition-all hover:border-white/30 hover:bg-white/5" aria-label="আগের">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button onClick={() => nudge(1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-mist-200 transition-all hover:border-white/30 hover:bg-white/5" aria-label="পরবর্তী">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          }
        />
      </div>

      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((p, i) => (
          <Link
            key={p.slug}
            href={`/post/${p.slug}`}
            className="group w-[300px] shrink-0 snap-start md:w-[380px]"
          >
            <article className="surface card-lift relative flex h-full flex-col overflow-hidden rounded-2xl p-6">
              <span className="font-latin absolute -right-1 -top-6 text-[5.5rem] font-bold leading-none text-white/[0.04]">
                {bn(String(i + 1).padStart(2, "0"))}
              </span>
              <PostImage src={p.image} alt={p.title} ratio="16/9" className="relative mb-4" />
              <div className="relative flex items-center justify-between">
                <Badge tone="mute">{p.category}</Badge>
                <HashStamp post={p} />
              </div>
              <h3 className="font-display-bn relative mt-4 line-clamp-3 text-[20px] leading-[1.38] text-mist-100 group-hover:text-white">
                {p.title}
              </h3>
              <p className="relative mt-3 line-clamp-3 flex-1 text-[13.5px] leading-relaxed text-mist-400">{p.dek}</p>
              <div className="relative mt-5 border-t border-white/8 pt-4">
                <PostStats post={p} />
              </div>
            </article>
          </Link>
        ))}
        <div className="w-[240px] shrink-0 snap-start">
          <div className="surface flex h-full flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center">
            <Badge tone="hot">
              <LiveDot tone="hot" /> AUTO-FEATURED
            </Badge>
            <p className="font-display-bn text-lg text-mist-100">প্রতি ৮ ঘণ্টায় নতুন সংগ্রহ</p>
            <Btn href="/admin" variant="outline" className="mt-2">
              ডেস্ক দেখুন
            </Btn>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-[1600px] px-5 md:px-8">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full transition-all duration-200" style={{ width: `${Math.max(6, progress)}%`, background: "var(--accent)" }} />
        </div>
      </div>
    </SectionShell>
  );
}

/* ── variant 5 · featured + wire list split ───────────────────────────── */
function FeaturedSplit({ posts, density }: { posts: PostRecord[]; density: "compact" | "comfortable" | "spacious" }) {
  const [first, ...rest] = posts;
  if (!first) return null;
  return (
    <SectionShell id="latest" density={density}>
      <SectionHead
        kicker="EDITORIAL FEATURE & WIRE"
        title={<>প্রধান ও <span className="text-gradient">সংগৃহীত তালিকা</span></>}
        desc="এক নজরে প্রধান সংবাদ ও তার পাশে সাম্প্রতিক ওয়্যার ফিড।"
      />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Link href={`/post/${first.slug}`} className="group block">
          <article className="surface-hi card-lift relative flex h-full flex-col justify-between overflow-hidden rounded-3xl">
            <PostImage src={first.image} alt={first.title} ratio="16/8" rounded="rounded-none" scrim />
            <div className="p-7 md:p-10">
              <div className="flex items-center justify-between">
                <Badge tone="hot">{first.category}</Badge>
                <HashStamp post={first} />
              </div>
              <h3 className="font-display-bn mt-5 text-[clamp(1.7rem,3.8vw,2.7rem)] leading-snug text-mist-100 group-hover:text-white">
                {first.title}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-mist-300">
                {first.dek}
              </p>
            </div>
            <div className="mx-7 mb-7 flex items-center justify-between border-t border-white/8 pt-5 md:mx-10 md:mb-10">
              <PostStats post={first} />
              <span className="mono-label text-mint-400">ফ্যাক্ট {bn(first.factScore)}</span>
            </div>
          </article>
        </Link>

        <div className="surface rounded-3xl p-6">
          <p className="mono-label mb-4 text-mist-400">ওয়্যারে যুক্ত অন্যান্য খবর</p>
          <div className="space-y-3 divide-y divide-white/8">
            {rest.slice(0, 4).map((p) => (
              <Link key={p.slug} href={`/post/${p.slug}`} className="group flex gap-3 pt-3 first:pt-0">
                <PostImage src={p.image} alt={p.title} ratio="1/1" className="w-16 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="mono-label block" style={{ color: "var(--accent)" }}>{p.category}</span>
                  <span className="font-display-bn mt-1 block line-clamp-2 text-[15px] leading-snug text-mist-100 group-hover:text-white">
                    {p.title}
                  </span>
                  <span className="mono-label mt-1 block text-mist-400">{timeAgo(p.publishedAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

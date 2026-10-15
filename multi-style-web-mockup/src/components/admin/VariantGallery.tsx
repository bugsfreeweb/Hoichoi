"use client";

import { useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { ArrowLeft, Eye, LayoutGrid, Zap } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Ticker from "@/components/site/Ticker";
import Footer from "@/components/site/Footer";
import AdSlot from "@/components/site/AdSlot";
import Hero from "@/components/home/Hero";
import Kpi, { type Totals } from "@/components/home/Kpi";
import Insights from "@/components/home/Insights";
import Pipeline from "@/components/home/Pipeline";
import Lead from "@/components/home/Lead";
import Latest from "@/components/home/Latest";
import { Categories, Newsletter, SystemHealth } from "@/components/home/Major";
import { Academy, Briefing, LiveWire } from "@/components/home/Extras";
import ReaderToolbar from "@/components/post/ReaderToolbar";
import { PostFactbar, PostHero, ShareBar } from "@/components/post/PostHero";
import {
  PostAnalytics,
  PostBody,
  PostGlance,
  PostRelated,
  PostTimeline,
  PostVerify,
} from "@/components/post/PostBody";
import {
  PostComments,
  PostLesson,
  PostReport,
} from "@/components/post/PostEngagement";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LogoLab from "@/components/admin/LogoLab";
import SectionTemplate from "@/components/ui/SectionTemplate";
import type { PostRecord } from "@/lib/posts";
import { SECTIONS, SCOPE_LABELS, ZONE_LABELS, type Scope, type Zone } from "@/lib/registry";
import { bn } from "@/lib/format";

const ZONE_ORDER: Zone[] = ["header", "hero", "main", "major", "footer"];

export default function VariantGallery({
  posts,
  featured,
  related,
  totals,
  accent,
}: {
  posts: PostRecord[];
  featured: PostRecord;
  related: PostRecord[];
  totals: Totals;
  accent: string;
}) {
  const [activeKey, setActiveKey] = useState<string>(SECTIONS[3].key);
  const [scope, setScope] = useState<Scope>("home");

  const meta = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0];
  const grouped = ZONE_ORDER.map((zone) => ({
    zone,
    items: SECTIONS.filter((s) => s.zone === zone && (s.scope === scope || s.scope === "global")),
  })).filter((g) => g.items.length);

  const render = (key: string, variant: string) => {
    const density = "comfortable" as const;
    switch (key) {
      case "ticker":
        return <Ticker variant={variant} />;
      case "navbar":
        return <Navbar variant={variant} />;
      case "footer":
        return <Footer variant={variant} />;
      case "hero":
        return <Hero variant={variant} density={density} totals={totals} />;
      case "kpi":
        return <Kpi variant={variant} density={density} totals={totals} />;
      case "insights":
        return <Insights variant={variant} density={density} />;
      case "pipeline":
        return <Pipeline variant={variant} density={density} />;
      case "wire":
        return <LiveWire variant={variant} density={density} />;
      case "briefing":
        return <Briefing variant={variant} density={density} posts={posts} />;
      case "academy":
        return <Academy variant={variant} density={density} />;
      case "lead":
        return <Lead variant={variant} density={density} post={featured} />;
      case "latest":
        return <Latest variant={variant} density={density} posts={posts} />;
      case "home-ad":
        return <AdSlot variant={variant} density={density} />;
      case "categories":
        return <Categories variant={variant} density={density} />;
      case "health":
        return <SystemHealth variant={variant} density={density} />;
      case "newsletter":
        return <Newsletter variant={variant} density={density} />;
      case "post-hero":
        return <PostHero variant={variant} density={density} post={featured} />;
      case "post-factbar":
        return <PostFactbar variant={variant} post={featured} />;
      case "post-tools":
        return (
          <div className="mx-auto max-w-[1320px] px-5 py-8 md:px-8">
            <ReaderToolbar
              variant={variant}
              slug={featured.slug}
              title={featured.title}
              source={featured.source}
              author={featured.author}
              publishedAt={featured.publishedAt}
              plainText={featured.body.map((b) => String((b as { text?: string }).text ?? "")).join(" ")}
            />
          </div>
        );
      case "post-glance":
        return <PostGlance variant={variant} density={density} post={featured} />;
      case "post-body":
        return <PostBody variant={variant} density={density} post={featured} />;
      case "post-lesson":
        return <PostLesson variant={variant} post={featured} density={density} previewUnlocked={true} />;
      case "post-ad":
        return <AdSlot variant={variant} density={density} />;
      case "post-timeline":
        return <PostTimeline variant={variant} density={density} post={featured} />;
      case "post-verify":
        return <PostVerify variant={variant} density={density} post={featured} />;
      case "post-analytics":
        return <PostAnalytics variant={variant} density={density} post={featured} />;
      case "post-comments":
        return <PostComments variant={variant} post={featured} density={density} />;
      case "post-report":
        return <PostReport variant={variant} post={featured} density={density} />;
      case "post-related":
        return <PostRelated variant={variant} density={density} posts={related} />;
      case "post-share":
        return (
          <div className="mx-auto max-w-[1320px] px-5 py-8 md:px-8">
            <ShareBar post={featured} variant={variant} />
          </div>
        );
      default:
        return null;
    }
  };

  const chromeKeys = ["ticker", "navbar", "footer"];
  const isChrome = chromeKeys.includes(meta.key);

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-ink-950/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-5 py-3 md:px-7">
          <span className="grid h-9 w-9 place-items-center rounded-lg shadow-sm" style={{ background: accent }}>
            <Zap className="h-4.5 w-4.5 text-ink-950" strokeWidth={2.6} />
          </span>
          <div className="leading-none">
            <p className="font-display-bn text-lg text-mist-100">হৈচৈ নকশা ও ভ্যারিয়েন্ট গ্যালারি</p>
            <p className="mono-label mt-0.5 text-mist-400">প্রতিটি সেকশনের ৫টি পৃথক ডিজাইন রূপভেদ</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ThemeToggle showSoundToggle />

            <Link href="/" className="mono-label flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-mist-200 transition-colors hover:border-white/30 hover:text-white">
              <Eye className="h-3.5 w-3.5" /> লাইভ সাইট
            </Link>
            <Link href="/admin" className="mono-label flex items-center gap-1.5 rounded-full px-3.5 py-2 font-semibold text-ink-950 transition-all hover:brightness-110" style={{ background: accent }}>
              <ArrowLeft className="h-3.5 w-3.5" /> অ্যাডমিন কনসোল
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1700px] gap-6 px-5 py-6 md:px-7 lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Index Sidebar in Bangla */}
        <aside className="lg:sticky lg:top-[76px] lg:h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1">
          <div className="mb-4 flex gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
            {(["home", "post", "global"] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setScope(s);
                  const first = SECTIONS.find((x) => x.scope === s || (s === "global" && x.scope === "global"));
                  if (first) setActiveKey(first.key);
                }}
                className={clsx(
                  "mono-label flex-1 rounded-lg px-2 py-2 transition-all text-center",
                  scope === s ? "text-ink-950 font-bold" : "text-mist-400 hover:text-mist-100",
                )}
                style={scope === s ? { background: accent } : undefined}
              >
                {SCOPE_LABELS[s].bn}
              </button>
            ))}
          </div>

          {grouped.map((g) => (
            <div key={g.zone} className="mb-5">
              <p className="mono-label mb-2 text-mist-400">{ZONE_LABELS[g.zone].bn}</p>
              <div className="space-y-1">
                {g.items.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setActiveKey(s.key)}
                    className={clsx(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                      activeKey === s.key
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-transparent hover:border-white/10 hover:bg-white/[0.03]",
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0" style={{ color: activeKey === s.key ? accent : "#7d8aa3" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-mist-100">{s.label}</span>
                      <span className="mono-label block truncate text-mist-400">
                        {bn(s.variants.length)}টি বিকল্প
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Variants Showcase */}
        <main className="min-w-0">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-4">
            <div>
              <p className="mono-label" style={{ color: accent }}>
                {ZONE_LABELS[meta.zone].bn}
              </p>
              <h1 className="font-display-bn mt-1.5 text-3xl text-mist-100">{meta.label}</h1>
              <p className="mt-1.5 max-w-2xl text-[14px] text-mist-400">{meta.description}</p>
            </div>
            <p className="mono-label text-mist-400">
              মোট {bn(meta.variants.length)}টি স্বতন্ত্র ডিজাইন
            </p>
          </div>

          {meta.key === "navbar" || meta.key === "footer" ? <LogoLab accent={accent} /> : null}

          <div className="space-y-10">
            {meta.variants.map((v, i) => (
              <section key={v.id} className="relative">
                <div className="mb-3.5 flex flex-wrap items-center gap-3">
                  <span className="font-latin grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold text-ink-950 shadow-sm" style={{ background: accent }}>
                    {bn(i + 1)}
                  </span>
                  <h2 className="font-display-bn text-xl text-mist-100">{v.name}</h2>
                  <span className="mono-label rounded-full border border-white/12 px-2.5 py-1 text-mist-400">রীতি: {v.id}</span>
                  {v.id === meta.defaultVariant ? (
                    <span className="mono-label rounded-full px-2.5 py-1 text-ink-950 font-bold" style={{ background: "#f5a524" }}>
                      ডিফল্ট বিকল্প
                    </span>
                  ) : null}
                  <span className="hidden text-[13px] text-mist-400 md:inline">{v.blurb}</span>
                </div>

                <SectionTemplate sectionKey={meta.key} variant={v.id}>
                  <div
                    className={clsx(
                      "relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-lg",
                      isChrome ? "h-[360px] overflow-y-auto" : "",
                    )}
                  >
                    {isChrome ? (
                      <div className="relative min-h-[360px]">
                        {render(meta.key, v.id)}
                        <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
                      </div>
                    ) : (
                      render(meta.key, v.id)
                    )}
                  </div>
                </SectionTemplate>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

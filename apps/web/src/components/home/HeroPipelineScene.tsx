"use client";

import { useEffect, useState } from "react";
import { toBn } from "@/lib/format";
import { sourcePlatformBn, sourceVisual } from "@/lib/source-meta";

/**
 * Hero scene — "how a story is collected".
 *
 * Reads top-to-bottom like the pipeline itself:
 *
 *   1. the raw source (a screenshot-style card from the real platform)
 *   2. a duplicate cross-check gate that scans the incoming item
 *   3. the published article card — real headline, real summary, real photo
 *
 * Everything shown is real data for the featured post: the platform comes from
 * `source_url`, the counts from the feed. Nothing is invented.
 *
 * Implementation notes
 *  - Pure SVG + CSS; no canvas and no requestAnimationFrame, so an idle hero
 *    costs nothing and server/client markup match (no random geometry).
 *  - All loops are transform/opacity only; `prefers-reduced-motion` stills them.
 */

export interface HeroSceneFeature {
  image: string | null;
  title: string;
  summary: string | null;
  sourceName: string;
  sourceUrl: string;
  category: string | null;
}

const STAGE_LABEL = ["০১ · সংগ্রহ", "০২ · যাচাই", "০৩ · প্রকাশ"];

export default function HeroPipelineScene({
  collected,
  published,
  dups,
  lastRunIso,
  feature,
}: {
  collected: number;
  published: number;
  dups: number;
  lastRunIso: string | null;
  feature?: HeroSceneFeature | null;
}) {
  const [phase, setPhase] = useState(0);
  const [alive, setAlive] = useState(false);

  useEffect(() => {
    setAlive(true);
    // Advance the "which stage is hot" highlight. 3 stages, ~2.6s each.
    const t = setInterval(() => setPhase((n) => (n + 1) % 3), 2600);
    return () => clearInterval(t);
  }, []);

  const source = sourceVisual({ source_url: feature?.sourceUrl, source_name: feature?.sourceName });
  const platformBn = feature ? sourcePlatformBn({ source_url: feature.sourceUrl, source_name: feature.sourceName }) : "সোর্স";
  const lastRun = lastRunIso
    ? new Date(lastRunIso).toLocaleTimeString("bn-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" })
    : null;
  const dedupePct = collected > 0 ? Math.round((dups / collected) * 100) : 0;

  return (
    <div className="hf-scene relative h-full w-full overflow-hidden rounded-2xl border border-ink/10">
      <div className="hf-scene-glow pointer-events-none absolute inset-0" aria-hidden />
      {/* faint engineering grid, so the stack reads as a system diagram */}
      <div className="hf-scene-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex h-full flex-col p-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono-x text-[9px] tracking-[0.22em] text-ink/45 uppercase">COLLECT → REWRITE → PUBLISH</p>
            <p className="mt-1 font-serif-bn text-[15px] leading-tight font-black text-ink">সংগ্রহ থেকে প্রকাশ</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-lime/40 bg-lime/10 px-2.5 py-1 font-mono-x text-[8.5px] tracking-[0.14em] text-lime uppercase">
            <span className="hf-scene-dot h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
            {lastRun ? `শেষ ${lastRun}` : "STANDBY"}
          </span>
        </header>

        <div className="relative mt-3 flex flex-1 flex-col justify-between gap-2">
          {/* connecting rail behind the cards */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="hf-rail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#fb7185" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <path
              d="M14 12 C 34 24, 34 34, 16 44 C 34 54, 34 66, 16 76 C 30 86, 44 90, 62 92"
              fill="none"
              stroke="url(#hf-rail)"
              strokeWidth="0.4"
              strokeDasharray="2 2.4"
              className={alive ? "hf-scene-flow" : undefined}
            />
          </svg>

          {/* ---------------------------------------------------- stage 1 · source */}
          <div className={`hf-card hf-card-tilt-l ${phase === 0 ? "hf-card-hot" : ""}`}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br text-[8px] font-bold text-white ${source.ring}`}
                aria-hidden
              >
                {source.glyph}
              </span>
              <span className="font-mono-x text-[8px] tracking-[0.16em] text-ink/45 uppercase">
                {STAGE_LABEL[0]} · {platformBn}
              </span>
              <span className="ml-auto font-mono-x text-[7.5px] text-ink/30">{feature?.sourceName.slice(0, 14) ?? "—"}</span>
            </div>
            {/* the "screenshot" itself: mediatype strip + captured block */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="relative h-8 w-12 shrink-0 overflow-hidden rounded border border-ink/15 bg-ink/10">
                {feature?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={feature.image} alt="" className="h-full w-full object-cover opacity-90" />
                ) : (
                  <div className="h-full w-full bg-[repeating-linear-gradient(45deg,currentColor_0_2px,transparent_2px_5px)] text-ink/15" />
                )}
                <span className="absolute inset-0 border border-white/10" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="space-y-[3px]">
                  <span className="block h-[3px] w-full rounded-full bg-ink/20" />
                  <span className="block h-[3px] w-4/5 rounded-full bg-ink/15" />
                  <span className="block h-[3px] w-3/5 rounded-full bg-ink/10" />
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------- stage 2 · dedupe crosscheck */}
          <div className={`hf-card hf-card-tilt-r ${phase === 1 ? "hf-card-hot" : ""}`}>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-x text-[8px] tracking-[0.16em] text-ink/45 uppercase">{STAGE_LABEL[1]} · SIMHASH</span>
              <span className={`ml-auto rounded-full px-1.5 py-[1px] font-mono-x text-[7.5px] font-bold ${dups > 0 ? "bg-alizarin/15 text-alizarin" : "bg-lime/15 text-lime"}`}>
                {dedupePct}% ডুপ
              </span>
            </div>
            {/* scan gate: a beam sweeps the item, verdict flips to PASS */}
            <div className="relative mt-1.5 h-6 overflow-hidden rounded border border-ink/12 bg-ink/[0.04]">
              <div className="flex h-full items-center gap-1 px-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span
                    key={i}
                    className="hf-scan-bar h-3 w-1 rounded-sm bg-ink/20"
                    style={{ animationDelay: `${i * 0.11}s` }}
                  />
                ))}
              </div>
              {alive && <span className="hf-scan-beam" aria-hidden />}
              <span className="absolute inset-y-0 right-1.5 flex items-center font-mono-x text-[7.5px] font-bold tracking-[0.12em] text-lime">
                ✓ NEW
              </span>
            </div>
          </div>

          {/* ------------------------------------------------- stage 3 · published */}
          <div className={`hf-card hf-card-tilt-l ${phase === 2 ? "hf-card-hot" : ""}`}>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-x text-[8px] tracking-[0.16em] text-ink/45 uppercase">{STAGE_LABEL[2]}</span>
              {feature?.category && (
                <span className="rounded-full bg-lime/15 px-1.5 py-[1px] font-mono-x text-[7.5px] text-lime">{feature.category}</span>
              )}
              <span className="ml-auto font-mono-x text-[7.5px] text-ink/30">PUBLISHED</span>
            </div>
            <div className="mt-1 flex gap-1.5">
              {feature?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={feature.image} alt="" className="h-9 w-9 shrink-0 rounded border border-ink/15 object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-serif-bn text-[10px] leading-[1.35] font-bold text-ink">
                  {feature?.title ?? "প্রকাশিত প্রতিবেদন"}
                </p>
                {feature?.summary && (
                  <p className="mt-0.5 line-clamp-1 text-[8px] leading-snug text-ink/45">{feature.summary}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* counters — real numbers only */}
        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-ink/10 pt-2">
          {[
            { label: "সংগৃহীত", value: collected, color: "text-ink" },
            { label: "ডুপ্লিকেট", value: dups, color: "text-alizarin" },
            { label: "প্রকাশিত", value: published, color: "text-lime" },
          ].map((k) => (
            <div key={k.label}>
              <p className="font-mono-x text-[7.5px] tracking-[0.14em] text-ink/40 uppercase">{k.label}</p>
              <p className={`mt-0.5 font-display text-[16px] leading-none font-bold ${k.color}`}>{toBn(k.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

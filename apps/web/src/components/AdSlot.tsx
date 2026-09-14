"use client";

import { useEffect, useRef, useState } from "react";
import { bnNum } from "@/lib/bn";

/* Inline SVG icons (web app avoids lucide-react). */
function MegaphoneIcon({ size = 9 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 0-5.6-2" />
    </svg>
  );
}

function TrendIcon({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

function ClickIcon({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
    </svg>
  );
}

type Variant = "leaderboard" | "rect" | "infeed" | "strip";

const impKey = "hoichoi-ad-impressions";
const clkKey = "hoichoi-ad-clicks";

/** Transparent mock advertisement slot — matches mockup/src/components/ad-slot.tsx.
 *  When `html` (paste from the admin ad-slot settings) is set, the raw ad code is
 *  rendered instead of the sponsor placeholder; scripts are re-injected so
 *  AdSense/Adsterra-style codes run after hydration. */
export function AdSlot({
  variant = "leaderboard",
  sponsor = "হৈচৈ লাইভ",
  headline = "আপনার বিজ্ঞাপন এখানে",
  sub = "হৈচৈ পাঠকের কাছে সরাসরি পৌঁছান — ads@hoichoi.example",
  html = null,
}: {
  variant?: Variant;
  sponsor?: string;
  headline?: string;
  sub?: string;
  html?: string | null;
}) {
  const [clicked, setClicked] = useState(false);
  const [bump, setBump] = useState(0);
  const rawRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(impKey) ?? 0) + 1;
      localStorage.setItem(impKey, String(n));
    } catch {
      /* noop */
    }
  }, []);

  /* Re-inject <script> tags inside admin-pasted HTML — innerHTML alone never
     executes scripts, so ad-network tags need this explicit pass. */
  useEffect(() => {
    if (!html || !rawRef.current) return;
    rawRef.current.querySelectorAll("script").forEach((s) => {
      const ns = document.createElement("script");
      ns.textContent = s.textContent ?? "";
      if (s.src) ns.src = s.src;
      s.replaceWith(ns);
    });
  }, [html]);

  const onAd = () => {
    let n = 1;
    try {
      n = Number(localStorage.getItem(clkKey) ?? 0) + 1;
      localStorage.setItem(clkKey, String(n));
    } catch {
      /* noop */
    }
    setClicked(true);
    setBump(n);
    setTimeout(() => setClicked(false), 2200);
  };

  const chip = (
    <span className="inline-flex items-center gap-1 rounded-sm border border-ink/30 bg-paper/90 px-1.5 py-0.5 font-mono-x text-[8.5px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
      <MegaphoneIcon />
      বিজ্ঞাপন · AD
    </span>
  );

  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className="ad-chip flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[13px] font-black text-lime">
          {sponsor.slice(0, 1)}
        </span>
        <div className="text-left">
          <p className="font-serif-bn text-[14px] leading-tight font-extrabold text-ink">{headline}</p>
          <p className="mt-0.5 text-[10.5px] text-ink-soft">{sub}</p>
        </div>
      </div>
      <span className="flex items-center gap-2 bg-ink px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-paper">
        {clicked ? <ClickIcon className="text-lime" /> : <TrendIcon className="text-lime" />}
        {clicked ? `ক্লিক #${bnNum(bump)} ✓` : "স্পনসর হোন"}
      </span>
    </>
  );

  // Admin-pasted ad code wins over the placeholder sponsor card.
  if (html) {
    const box = (extra: string, bgDark = false) => (
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden border border-dashed ${bgDark ? "border-night/35 bg-night" : "border-ink/35 bg-paper-deep/40"} ${extra}`}
      >
        <div ref={rawRef} className="ad-raw w-full" dangerouslySetInnerHTML={{ __html: html }} />
        <span className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-sm border border-ink/30 bg-paper/90 px-1.5 py-0.5 font-mono-x text-[8.5px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
          <MegaphoneIcon /> বিজ্ঞাপন · AD
        </span>
      </div>
    );

    if (variant === "infeed") {
      return <div className="h-full min-h-[280px]">{box("h-full min-h-[280px]")}</div>;
    }
    if (variant === "rect") {
      return box("min-h-[250px] p-2");
    }
    if (variant === "strip") {
      return box("min-h-[64px] p-2", true);
    }
    return box("min-h-[90px] p-2");
  }

  return (
    <button
      onClick={onAd}
      aria-label="বিজ্ঞাপন"
      className={`group relative block w-full ${variant === "infeed" ? "" : "text-center"}`}
    >
      {variant === "leaderboard" && (
        <div className="relative flex min-h-[90px] items-center justify-center gap-4 overflow-hidden border border-dashed border-ink/35 bg-paper-deep/40 px-5 py-6 transition-colors duration-300 hover:border-ink/60">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_42%,rgba(210,32,44,0.07)_50%,transparent_58%)] bg-[length:250%_100%] opacity-0 transition-opacity duration-500 group-hover:animate-[shine_2.4s_linear_infinite] group-hover:opacity-100" />
          {body}
          <span className="absolute top-2 right-2">{chip}</span>
        </div>
      )}

      {variant === "rect" && (
        <div className="relative flex min-h-[250px] flex-col items-center justify-center gap-4 border border-dashed border-ink/35 bg-paper-deep/40 p-6 transition-colors duration-300 hover:border-ink/60">
          <span className="absolute top-2 right-2">{chip}</span>
          {body}
        </div>
      )}

      {variant === "infeed" && (
        <div className="relative h-full min-h-[280px] border-[1.5px] border-dashed border-ink/45 bg-paper-deep/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ink">
          <span className="absolute top-3 right-3">{chip}</span>
          <span className="ad-chip flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[16px] font-black text-lime">
            {sponsor.slice(0, 1)}
          </span>
          <p className="mt-6 font-serif-bn text-[19px] leading-snug font-extrabold text-ink">{headline}</p>
          <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">{sub}</p>
          <span className="mt-5 inline-flex items-center gap-2 bg-ink px-4 py-2 text-[11.5px] font-bold text-paper">
            <TrendIcon className="text-lime" />
            {clicked ? `ক্লিক #${bnNum(bump)} ✓` : "বিস্তারিত"}
          </span>
        </div>
      )}

      {variant === "strip" && (
        <div className="relative flex min-h-[64px] items-center justify-center gap-4 border border-dashed border-ink/35 bg-ink px-5 py-4 text-paper transition-colors duration-300 hover:bg-[#241d12]">
          {body}
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-sm border border-paper/30 px-1.5 py-0.5 font-mono-x text-[8.5px] font-semibold tracking-[0.2em] text-paper/70 uppercase">
            <MegaphoneIcon /> AD
          </span>
        </div>
      )}
    </button>
  );
}
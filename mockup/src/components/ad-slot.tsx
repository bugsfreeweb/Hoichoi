"use client";

import { useEffect, useState } from "react";
import { Megaphone, MousePointerClick, TrendingUp } from "lucide-react";
import { toBn } from "@/lib/format";

type Variant = "leaderboard" | "rect" | "infeed" | "strip";

const impKey = "hoichoi-ad-impressions";
const clkKey = "hoichoi-ad-clicks";

/**
 * Transparent mock advertisement slot.
 * Demo analytics: impressions counted on mount, clicks on tap (localStorage).
 * Swap the inner content for a real ad network (AdSense / Adsterra) in prod.
 */
export default function AdSlot({
  variant = "leaderboard",
  sponsor = "হইচই লাইভ",
  headline = "আপনার বিজ্ঞাপন এখানে",
  sub = "হইচই পাঠকের কাছে সরাসরি পৌঁছান — ads@hoichoi.example",
}: {
  variant?: Variant;
  sponsor?: string;
  headline?: string;
  sub?: string;
}) {
  const [clicked, setClicked] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(impKey) ?? 0) + 1;
      localStorage.setItem(impKey, String(n));
    } catch {
      /* noop */
    }
  }, []);

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
      <Megaphone size={9} /> বিজ্ঞাপন · AD
    </span>
  );

  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[13px] font-black text-lime">
          {sponsor.slice(0, 1)}
        </span>
        <div className="text-left">
          <p className="font-serif-bn text-[14px] leading-tight font-extrabold text-ink">
            {headline}
          </p>
          <p className="mt-0.5 text-[10.5px] text-ink-soft">{sub}</p>
        </div>
      </div>
      <span className="flex items-center gap-2 bg-ink px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-paper">
        {clicked ? <MousePointerClick size={12} className="text-lime" /> : <TrendingUp size={12} className="text-lime" />}
        {clicked ? `ক্লিক #${toBn(bump)} ✓` : "স্পনসর হোন"}
      </span>
    </>
  );

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
          {chip && <span className="absolute top-2 right-2">{chip}</span>}
          {body}
        </div>
      )}

      {variant === "infeed" && (
        <div className="relative h-full min-h-[280px] border-[1.5px] border-dashed border-ink/45 bg-paper-deep/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ink">
          <span className="absolute top-3 right-3">{chip}</span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[16px] font-black text-lime">
            {sponsor.slice(0, 1)}
          </span>
          <p className="mt-6 font-serif-bn text-[19px] leading-snug font-extrabold text-ink">
            {headline}
          </p>
          <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">
            {sub}
          </p>
          <span className="mt-5 inline-flex items-center gap-2 bg-ink px-4 py-2 text-[11.5px] font-bold text-paper">
            <TrendingUp size={12} className="text-lime" />
            {clicked ? `ক্লিক #${toBn(bump)} ✓` : "বিস্তারিত"}
          </span>
        </div>
      )}

      {variant === "strip" && (
        <div className="relative flex min-h-[64px] items-center justify-center gap-4 border border-dashed border-ink/35 bg-ink px-5 py-4 text-paper transition-colors duration-300 hover:bg-[#241d12]">
          {body}
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-sm border border-paper/30 px-1.5 py-0.5 font-mono-x text-[8.5px] font-semibold tracking-[0.2em] text-paper/70 uppercase">
            <Megaphone size={9} /> AD
          </span>
        </div>
      )}
    </button>
  );
}

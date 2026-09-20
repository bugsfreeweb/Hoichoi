"use client";

import { useEffect, useRef, useState } from "react";
import { Megaphone, MousePointerClick, TrendingUp } from "lucide-react";
import { toBn } from "@/lib/format";
import {
  DEFAULT_AD_CONFIG,
  adEnabledFor,
  analyticsTotals,
  countClick,
  countImpression,
  readAdConfig,
  readAnalytics,
  type AdPlacement,
} from "@/lib/ads";

type Variant = AdPlacement;

/**
 * Transparent mock advertisement slot.
 * Demo analytics: impressions counted on mount, clicks on tap (localStorage).
 * Swap the inner content for a real ad network (AdSense / Adsterra) in prod.
 */
export default function AdSlot({ variant = "leaderboard" }: { variant?: Variant }) {
  const [clicked, setClicked] = useState(false);
  const [bump, setBump] = useState(0);
  const counted = useRef(false);
  const [configTick, setConfigTick] = useState(0);

  const cfg = readAdConfig();
  const sponsor = cfg.sponsor || DEFAULT_AD_CONFIG.sponsor;
  const headline = cfg.headline || DEFAULT_AD_CONFIG.headline;
  const sub = cfg.sub || DEFAULT_AD_CONFIG.sub;
  const cta = cfg.cta || DEFAULT_AD_CONFIG.cta;
  const link = cfg.link.trim();
  const html = cfg.html.trim();
  const visible = adEnabledFor(variant);
  const isNetworkAd = Boolean(html) && !link;

  useEffect(() => {
    const onConfig = () => setConfigTick((n) => n + 1);
    window.addEventListener("hoichoi-ads:updated", onConfig);
    window.addEventListener("storage", onConfig);
    return () => {
      window.removeEventListener("hoichoi-ads:updated", onConfig);
      window.removeEventListener("storage", onConfig);
    };
  }, []);

  useEffect(() => {
    if (!counted.current && visible) {
      counted.current = true;
      countImpression(variant);
    }
  }, [variant, visible, configTick]);

  const onAd = () => {
    countClick(variant);
    const totals = analyticsTotals(readAnalytics());
    setClicked(true);
    setBump(totals.clicks);
    setTimeout(() => setClicked(false), 2200);
    if (link) {
      try {
        window.open(link, "_blank", "noopener,noreferrer");
      } catch {
        /* noop */
      }
    }
  };

  if (!visible) return null;

  if (isNetworkAd) {
    return (
      <div className={`group relative w-full ${variant === "infeed" ? "" : "text-center"}`}>
        <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-sm border border-ink/30 bg-paper/90 px-1.5 py-0.5 font-mono-x text-[8.5px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
          <Megaphone size={9} /> বিজ্ঞাপন · AD
        </span>
        <iframe
          title="বিজ্ঞাপন"
          srcDoc={html}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="block w-full border-0"
          style={{
            height:
              variant === "rect"
                ? "250px"
                : variant === "infeed"
                  ? "280px"
                  : variant === "strip"
                    ? "64px"
                    : "90px",
          }}
          onLoad={() => countImpression(variant)}
        />
      </div>
    );
  }

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
        {clicked ? `ক্লিক #${toBn(bump)} ✓` : cta}
      </span>
    </>
  );

  /* Strip lives on the fixed dark band — always light type + lime CTA. */
  const bandBody = (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-bandline/40 bg-bandline text-[13px] font-black text-band">
          {sponsor.slice(0, 1)}
        </span>
        <div className="text-left">
          <p className="font-serif-bn text-[14px] leading-tight font-extrabold text-bandline">
            {headline}
          </p>
          <p className="mt-0.5 text-[10.5px] text-bandline/60">{sub}</p>
        </div>
      </div>
      <span className="flex items-center gap-2 bg-lime px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-night">
        {clicked ? <MousePointerClick size={12} /> : <TrendingUp size={12} />}
        {clicked ? `ক্লিক #${toBn(bump)} ✓` : cta}
      </span>
    </>
  );

  const inner = (
    <>
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
          <span className="ad-chip flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[16px] font-black text-lime">
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
            {clicked ? `ক্লিক #${toBn(bump)} ✓` : cta}
          </span>
        </div>
      )}

      {variant === "strip" && (
        <div className="relative flex min-h-[64px] items-center justify-center gap-4 border border-dashed border-bandline/25 bg-band px-5 py-4 text-bandline transition-colors duration-300 hover:bg-[#241d12]">
          {bandBody}
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-sm border border-bandline/30 px-1.5 py-0.5 font-mono-x text-[8.5px] font-semibold tracking-[0.2em] text-bandline/70 uppercase">
            <Megaphone size={9} /> AD
          </span>
        </div>
      )}
    </>
  );

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noreferrer sponsored"
        onClick={onAd}
        aria-label="বিজ্ঞাপন"
        className={`group relative block w-full ${variant === "infeed" ? "" : "text-center"}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      onClick={onAd}
      aria-label="বিজ্ঞাপন"
      className={`group relative block w-full ${variant === "infeed" ? "" : "text-center"}`}
    >
      {inner}
    </button>
  );
}

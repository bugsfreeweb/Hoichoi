import Link from "next/link";
import Creative from "./Creative";
import { serveSlot } from "@/lib/ads/serve";
import { SLOT_MAP } from "@/lib/ads/slots";
import type { AdFormat, CreativeKind, LangCode, PaletteKey } from "@/lib/ads/types";

/* ------------------------------------------------------------------ *
 * AD tag — the exact chip used on hoichoifeed.vercel.app
 * ------------------------------------------------------------------ */
function AdTag({ dark = false, label = "বিজ্ঞাপন · AD" }: { dark?: boolean; label?: string }) {
  return (
    <span className="absolute top-2 right-2 z-10">
      <span
        className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono-x text-[8.5px] font-semibold tracking-[0.2em] uppercase ${
          dark
            ? "border-bandline/30 text-bandline/70"
            : "border-ink/30 bg-paper/90 text-ink-soft"
        }`}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 11 18-5v12L3 13v-2z" />
          <path d="M11.6 16.8a3 3 0 1 0-5.6-2" />
        </svg>
        {label}
      </span>
    </span>
  );
}

const TrendIcon = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </svg>
);

const HOUSE_TITLE = "আপনার বিজ্ঞাপন এখানে";
const HOUSE_SUB = "হৈচৈ পাঠকের কাছে সরাসরি পৌঁছান — ads@hoichoi.example";

/* ================================================================== *
 * HOUSE ADS — 1:1 clones of the current live markup
 * ================================================================== */

/** home_hero_below / post_header_leaderboard / category_top_leaderboard */
function HouseLeaderboard({ tall }: { tall?: boolean }) {
  return (
    <Link href="/advertise" aria-label="বিজ্ঞাপন" className="group relative block w-full text-center">
      <div
        className={`relative flex ${
          tall ? "min-h-[160px]" : "min-h-[90px]"
        } items-center justify-center gap-4 overflow-hidden border border-dashed border-ink/35 bg-paper-deep/40 px-5 py-6 transition-colors duration-300 hover:border-ink/60`}
      >
        <div className="ad-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:animate-[shine_2.4s_linear_infinite] group-hover:opacity-100" />
        <div className="flex items-center gap-3">
          <span className="ad-chip flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[13px] font-black text-lime">
            হ
          </span>
          <div className="text-left">
            <p className="font-serif-bn text-[14px] leading-tight font-extrabold text-ink">{HOUSE_TITLE}</p>
            <p className="mt-0.5 text-[10.5px] text-ink-soft">{HOUSE_SUB}</p>
          </div>
        </div>
        <span className="flex items-center gap-2 bg-ink px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-paper">
          <TrendIcon className="text-lime" />
          স্পনসর হোন
        </span>
        <AdTag />
      </div>
    </Link>
  );
}

/** home_feed_1 / home_feed_2 / *_infeed — the in-grid card */
function HouseInfeed() {
  return (
    <Link href="/advertise" aria-label="বিজ্ঞাপন" className="group relative block w-full">
      <div className="relative h-full min-h-[280px] border-[1.5px] border-dashed border-ink/45 bg-paper-deep/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ink">
        <AdTag />
        <span className="ad-chip flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[16px] font-black text-lime">
          হ
        </span>
        <p className="mt-6 font-serif-bn text-[19px] leading-snug font-extrabold text-ink">{HOUSE_TITLE}</p>
        <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">{HOUSE_SUB}</p>
        <span className="mt-5 inline-flex items-center gap-2 bg-ink px-4 py-2 text-[11.5px] font-bold text-paper">
          <TrendIcon className="text-lime" />
          বিস্তারিত
        </span>
      </div>
    </Link>
  );
}

/** post_sidebar_rect / post_inarticle — the stacked rectangle */
function HouseRect({ minH = 250 }: { minH?: number }) {
  return (
    <Link href="/advertise" aria-label="বিজ্ঞাপন" className="group relative block w-full text-center">
      <div
        className="relative flex flex-col items-center justify-center gap-4 border border-dashed border-ink/35 bg-paper-deep/40 p-6 transition-colors duration-300 hover:border-ink/60"
        style={{ minHeight: minH }}
      >
        <AdTag />
        <div className="flex items-center gap-3">
          <span className="ad-chip flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[13px] font-black text-lime">
            হ
          </span>
          <div className="text-left">
            <p className="font-serif-bn text-[14px] leading-tight font-extrabold text-ink">{HOUSE_TITLE}</p>
            <p className="mt-0.5 text-[10.5px] text-ink-soft">{HOUSE_SUB}</p>
          </div>
        </div>
        <span className="flex items-center gap-2 bg-ink px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-paper">
          <TrendIcon className="text-lime" />
          স্পনসর হোন
        </span>
      </div>
    </Link>
  );
}

/** home_prefooter_strip / global_footer_strip — the dark band strip */
function HouseStrip() {
  return (
    <Link href="/advertise" aria-label="বিজ্ঞাপন" className="group relative block w-full text-center">
      <div className="ad-strip relative flex min-h-[64px] items-center justify-center gap-4 border border-dashed border-bandline/25 bg-band px-5 py-4 text-bandline">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-bandline/40 bg-bandline text-[13px] font-black text-band">
            হ
          </span>
          <div className="text-left">
            <p className="font-serif-bn text-[14px] leading-tight font-extrabold text-bandline">{HOUSE_TITLE}</p>
            <p className="mt-0.5 text-[10.5px] text-bandline/60">{HOUSE_SUB}</p>
          </div>
        </div>
        <span className="flex items-center gap-2 bg-lime px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-night">
          <TrendIcon />
          স্পনসর হোন
        </span>
        <AdTag dark label="AD" />
      </div>
    </Link>
  );
}

function HouseSky() {
  return (
    <Link href="/advertise" aria-label="বিজ্ঞাপন" className="group relative block w-full">
      <div className="relative flex min-h-[600px] flex-col items-center justify-center gap-5 border border-dashed border-ink/35 bg-paper-deep/40 p-4 text-center transition-colors duration-300 hover:border-ink/60">
        <AdTag />
        <span className="ad-chip flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-ink text-[15px] font-black text-lime">
          হ
        </span>
        <p className="font-serif-bn text-[15px] leading-snug font-extrabold text-ink">{HOUSE_TITLE}</p>
        <p className="text-[10.5px] leading-relaxed text-ink-soft">{HOUSE_SUB}</p>
        <span className="inline-flex items-center gap-1.5 bg-ink px-3 py-1.5 text-[10.5px] font-bold text-paper">
          <TrendIcon className="text-lime" />
          স্পনসর হোন
        </span>
      </div>
    </Link>
  );
}

function HouseNative({ label = "সৌজন্যে" }: { label?: string }) {
  return (
    <Link
      href="/advertise"
      aria-label="বিজ্ঞাপন"
      className="group inline-flex items-center gap-2 border border-dashed border-ink/35 bg-paper-deep/40 px-3 py-1.5 transition-colors hover:border-ink/70"
    >
      <span className="ad-chip flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[9px] font-black text-lime">
        হ
      </span>
      <span className="font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">{label}</span>
      <span className="font-serif-bn text-[12.5px] font-extrabold text-ink">এই জায়গাটি খালি</span>
      <span className="font-mono-x text-[8.5px] tracking-[0.2em] text-ink-soft uppercase">· AD</span>
    </Link>
  );
}

function HouseAnchor() {
  return (
    <Link href="/advertise" aria-label="বিজ্ঞাপন" className="flex w-full items-center gap-3 px-3 py-2">
      <span className="ad-chip flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-black text-lime">
        হ
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-serif-bn text-[12.5px] font-extrabold text-ink">{HOUSE_TITLE}</span>
        <span className="block truncate text-[9.5px] text-ink-soft">ads@hoichoi.example</span>
      </span>
      <span className="shrink-0 bg-ink px-3 py-1.5 text-[10.5px] font-bold text-paper">স্পনসর</span>
    </Link>
  );
}

function House({ format }: { format: AdFormat }) {
  switch (format) {
    case "billboard":
      return <HouseLeaderboard tall />;
    case "leaderboard":
      return <HouseLeaderboard />;
    case "infeed":
      return <HouseInfeed />;
    case "rect":
      return <HouseRect />;
    case "strip":
      return <HouseStrip />;
    case "sky":
      return <HouseSky />;
    case "anchor":
      return <HouseAnchor />;
    case "native":
      return <HouseNative />;
    default:
      return <HouseLeaderboard />;
  }
}

/* ================================================================== *
 * Live (booked) creative wrapper — same footprint, same AD tag
 * ================================================================== */
function LiveFrame({
  format,
  children,
  href,
  advertiser,
}: {
  format: AdFormat;
  children: React.ReactNode;
  href?: string;
  advertiser: string;
}) {
  const minH: Record<string, number> = {
    leaderboard: 90,
    billboard: 160,
    rect: 250,
    infeed: 280,
    sky: 600,
    strip: 64,
    anchor: 56,
    native: 44,
  };
  const dark = format === "strip";
  return (
    <a
      href={href || "#"}
      target="_blank"
      rel="nofollow noopener sponsored"
      aria-label={`বিজ্ঞাপন — ${advertiser}`}
      className="ad-live group block w-full"
      style={{ minHeight: minH[format] }}
    >
      <AdTag dark={dark} label={format === "strip" ? "AD" : "বিজ্ঞাপন · AD"} />
      <div style={{ minHeight: minH[format] }} className="h-full">
        {children}
      </div>
    </a>
  );
}

/* ================================================================== *
 * Public component
 * ================================================================== */
export default async function AdSlot({
  slotKey,
  lang = "bn",
  className = "",
  formatOverride,
}: {
  slotKey: string;
  lang?: LangCode;
  className?: string;
  formatOverride?: AdFormat;
}) {
  const meta = SLOT_MAP[slotKey];
  const format = formatOverride ?? meta?.format ?? "leaderboard";
  const served = await serveSlot(slotKey, lang);

  return (
    <div className={`relative ${className}`} data-ad-slot={slotKey} data-ad-format={format}>
      {served ? (
        <LiveFrame format={format} href={served.url} advertiser={served.advertiser}>
          <Creative
            kind={served.kind as CreativeKind}
            palette={served.palette as PaletteKey}
            data={served.data}
            format={format}
            style={served.style}
            layout={served.layout}
          />
        </LiveFrame>
      ) : (
        <House format={format} />
      )}
    </div>
  );
}

export { House as HouseAd, HouseNative, HouseAnchor };

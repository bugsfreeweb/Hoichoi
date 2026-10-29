import Link from "next/link";
import { CATEGORIES, POSTS } from "@/lib/site-data";
import AdSlot, { HouseNative } from "@/components/ads/AdSlot";
import { serveSlot } from "@/lib/ads/serve";
import Creative from "@/components/ads/Creative";
import type { CreativeKind, PaletteKey } from "@/lib/ads/types";
import ThemeToggle from "@/components/theme/ThemeToggle";

/* ===================== TOP BAR (fixed, h-10) ===================== */
export function TopBar({ active = "site" }: { active?: "site" | "admin" | "system" | "ads" }) {
  const Item = ({
    href,
    on,
    children,
  }: {
    href: string;
    on: boolean;
    children: React.ReactNode;
  }) => (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-all duration-300 ${
        on ? "bg-[#a3121d] text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60] h-10 border-b border-white/10 bg-[#0a0c10] text-[#f3eee1]/85">
        <div className="mx-auto flex h-full max-w-site items-center justify-between px-4">
          <Link
            href="/"
            title="ওয়েবসাইট হোমপেজ"
            className="group flex items-center gap-2.5 font-mono-x text-[10px] tracking-[0.22em] uppercase transition-colors hover:text-[#f3eee1]"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alizarin opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-alizarin" />
            </span>
            HOICHOI <span className="hidden text-white/40 sm:inline">·</span>
            <span className="hidden text-white/40 sm:inline">TAURI DESK</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Item href="/" on={active === "site"}>
              <svg width="12.5" height="12.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18h-5" /><path d="M18 14h-8" />
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" />
                <rect width="8" height="4" x="10" y="6" rx="1" />
              </svg>
              <span className="hidden sm:inline">পাবলিক সাইট</span>
            </Item>
            <Item href="/admin/ads" on={active === "admin"}>
              <svg width="12.5" height="12.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7 11 2-2-2-2" /><path d="M11 13h4" />
                <rect width="18" height="18" x="3" y="3" rx="2" />
              </svg>
              <span className="hidden sm:inline">ওয়েব অ্যাডমিন</span>
            </Item>
            <Item href="/advertise" on={active === "ads"}>
              <svg width="12.5" height="12.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 11 18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 0-5.6-2" />
              </svg>
              <span className="hidden sm:inline">বিজ্ঞাপন</span>
            </Item>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden items-center gap-2 font-mono-x text-[10px] tracking-[0.18em] text-white/35 uppercase xl:flex">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6a9 9 0 0 0-9 9V3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              </svg>
              <span>→</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 18H2L12 3z" /></svg>
              <span className="text-white/50">AUTO-SHIP · EVERY 2H</span>
            </div>
            <ThemeToggle compact />
          </div>
        </div>
      </header>
      <div className="h-10" />
    </>
  );
}

/* ===================== TICKER + native sponsor slot ===================== */
export async function Ticker() {
  const sponsor = await serveSlot("home_ticker_sponsor");
  const items = POSTS.slice(0, 6);
  return (
    <div className="ticker-wrap overflow-hidden border-b border-band bg-band text-bandline">
      <div className="flex items-stretch">
        <div className="z-10 flex shrink-0 items-center gap-2 bg-alizarin-deep px-4 py-2 text-white">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
            <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" />
            <path d="M8 6v8" />
          </svg>
          <span className="font-serif-bn text-[12.5px] font-bold tracking-wide">জরুরি আপডেট</span>
        </div>

        <div className="relative flex flex-1 items-center overflow-hidden">
          <div className="ticker-track items-center" style={{ width: "max-content" }}>
            {[...items, ...items].map((p, i) => (
              <span key={`${p.slug}-${i}`} className="flex items-center gap-3 whitespace-nowrap px-5 text-[13px] text-bandline/85">
                <span className="h-1 w-1 rotate-45 bg-alizarin" />
                <Link className="hover:text-lime" href={`/post/${p.slug}`}>
                  {p.title}
                </Link>
              </span>
            ))}
          </div>
        </div>

        {/* ── AD SLOT: home_ticker_sponsor (native, new) ── */}
        <div
          data-ad-slot="home_ticker_sponsor"
          className="z-10 hidden shrink-0 items-center gap-2 border-l border-bandline/15 bg-band pr-3 pl-3 lg:flex"
        >
          {sponsor ? (
            <a
              href={sponsor.url || "#"}
              target="_blank"
              rel="nofollow noopener sponsored"
              className="flex items-center gap-2"
            >
              <span className="font-mono-x text-[8.5px] tracking-[0.2em] text-bandline/45 uppercase">AD</span>
              <span className="w-[290px]">
                <Creative
                  kind={sponsor.kind as CreativeKind}
                  palette={sponsor.palette as PaletteKey}
                  data={sponsor.data}
                  format="native"
                  style={sponsor.style}
                  layout={sponsor.layout}
                  dense
                />
              </span>
            </a>
          ) : (
            <>
              <span className="font-mono-x text-[8.5px] tracking-[0.2em] text-bandline/45 uppercase">AD</span>
              <Link
                href="/advertise"
                className="flex items-center gap-2 border border-dashed border-bandline/30 px-2.5 py-1 transition-colors hover:border-bandline/60"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-bandline text-[8px] font-black text-band">
                  হ
                </span>
                <span className="font-serif-bn text-[11.5px] font-bold text-bandline/85">
                  টিকার সৌজন্য — খালি
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== CATEGORY RAIL + native chip slot ===================== */
export async function CategoryRail() {
  const chip = await serveSlot("home_category_rail");
  return (
    <section className="border-y border-ink/15 bg-ink/[0.06]">
      <div className="mx-auto max-w-site px-4 py-7 md:px-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-1 font-mono-x text-[10px] tracking-[0.28em] text-ink-soft uppercase">
            ▚ বিভাগসমূহ
          </span>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="group flex items-center gap-2 border border-ink/20 bg-paper px-3.5 py-1.5 text-[12.5px] font-bold text-ink transition-all duration-300 hover:border-ink hover:bg-ink hover:text-paper"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
              {c.name}
              <span className="font-mono-x text-[9.5px] font-medium text-ink-soft group-hover:text-paper/60">
                {c.count}
              </span>
            </Link>
          ))}

          {/* ── AD SLOT: home_category_rail (native chip, new) ── */}
          <span data-ad-slot="home_category_rail" className="ml-auto">
            {chip ? (
              <a href={chip.url || "#"} target="_blank" rel="nofollow noopener sponsored" className="block w-[320px]">
                <Creative
                  kind={chip.kind as CreativeKind}
                  palette={chip.palette as PaletteKey}
                  data={chip.data}
                  format="native"
                  style={chip.style}
                  layout={chip.layout}
                  dense
                />
              </a>
            ) : (
              <HouseNative label="বিভাগ স্পনসর" />
            )}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ===================== FOOTER ===================== */
export function Footer() {
  const half = Math.ceil(CATEGORIES.length / 2);
  return (
    <footer className="page-chrome border-t-2 border-ink">
      {/* ── AD SLOT: global_footer_strip (new) ── */}
      <div className="mx-auto max-w-site px-4 pt-10 md:px-8">
        <AdSlot slotKey="global_footer_strip" />
      </div>

      <div className="mx-auto max-w-site px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-serif-bn text-[16px] font-black text-lime ring-1 ring-black/10">
                হ
              </span>
              <span className="font-serif-bn text-[34px] leading-none font-black text-ink">
                হৈচৈ<span className="text-alizarin">।</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-ink-soft">
              শহরের হৈচৈ, সংবাদের ভাষায় — ফেসবুক পেজ ও গ্রুপ, অনলাইন সংবাদপত্র, ম্যাগাজিন এবং সামাজিক
              মাধ্যমে ছড়িয়ে পড়া গল্প সংগ্রহ করে যাচাই, ডুপ্লিকেট-ফিল্টার ও এআই-সম্পাদনার পর বাংলায় প্রকাশিত
              সংবাদ-ধাঁচের সাইট।
            </p>
          </div>

          <div className="md:col-span-4">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">বিভাগসমূহ</p>
            <div className="mt-4 flex gap-x-8">
              {[CATEGORIES.slice(0, half), CATEGORIES.slice(half)].map((col, i) => (
                <ul key={i} className="space-y-2.5 text-[13px] font-medium">
                  {col.map((c) => (
                    <li key={c.slug} className="flex items-center gap-2">
                      <span className="h-1 w-1 rotate-45 bg-alizarin" />
                      <Link className="hover:text-alizarin" href={`/category/${c.slug}`}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">বিজ্ঞাপন</p>
            <ul className="mt-4 space-y-2.5 text-[13px] font-medium">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rotate-45 bg-lime" />
                <Link className="hover:text-alizarin" href="/advertise">বিজ্ঞাপন দিন</Link>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rotate-45 bg-lime" />
                <Link className="hover:text-alizarin" href="/advertise#slots">স্লট ও রেট কার্ড</Link>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rotate-45 bg-lime" />
                <Link className="hover:text-alizarin" href="/portal">ক্লায়েন্ট প্যানেল</Link>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rotate-45 bg-lime" />
                <Link className="hover:text-alizarin" href="/admin/ads">অ্যাড অ্যাডমিন</Link>
              </li>
            </ul>
            <p className="mt-5 font-mono-x text-[10.5px] text-ink-soft">ads@hoichoi.example</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-6">
          <p className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
            © ২০২৬ হৈচৈ। · ALL RIGHTS RESERVED
          </p>
          <p className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
            FEED → SHOT → HASH → LLM → GIT → DEPLOY
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ===================== MOBILE ANCHOR (global slot) ===================== */
export async function MobileAnchor() {
  const ad = await serveSlot("global_mobile_anchor");
  return (
    <div
      data-ad-slot="global_mobile_anchor"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-paper/95 backdrop-blur md:hidden"
    >
      <span className="absolute -top-[9px] left-3 bg-ink px-1.5 py-[1px] font-mono-x text-[8px] tracking-[0.2em] text-paper uppercase">
        বিজ্ঞাপন · AD
      </span>
      {ad ? (
        <a href={ad.url || "#"} target="_blank" rel="nofollow noopener sponsored" className="block">
          <Creative
            kind={ad.kind as CreativeKind}
            palette={ad.palette as PaletteKey}
            data={ad.data}
            format="anchor"
            style={ad.style}
            layout={ad.layout}
            dense
          />
        </a>
      ) : (
        <Link href="/advertise" className="flex w-full items-center gap-3 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-black text-lime">
            হ
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate font-serif-bn text-[12.5px] font-extrabold text-ink">
              আপনার বিজ্ঞাপন এখানে
            </span>
            <span className="block truncate text-[9.5px] text-ink-soft">ads@hoichoi.example</span>
          </span>
          <span className="shrink-0 bg-ink px-3 py-1.5 text-[10.5px] font-bold text-paper">স্পনসর</span>
        </Link>
      )}
    </div>
  );
}

/* ===================== RIGHT STICKY RAIL (global slot) ===================== */
export function RightRail() {
  return (
    <div className="pointer-events-none fixed top-1/2 right-2 z-40 hidden -translate-y-1/2 2xl:block">
      <div className="pointer-events-auto w-[160px]">
        <AdSlot slotKey="global_rail_right" />
      </div>
    </div>
  );
}

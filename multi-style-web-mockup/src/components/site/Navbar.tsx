"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Menu, Settings2, X, ChevronDown, Hash } from "lucide-react";
import { LiveDot } from "@/components/ui/primitives";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BrandLogo, { type LogoEngine } from "@/components/ui/BrandLogo";
import SearchButton from "@/components/site/SearchButton";
import { Magnetic } from "@/components/ui/motion";
import { CATEGORY_MIX } from "@/lib/data";
import { bn } from "@/lib/format";

const NAV = [
  { href: "/", label: "হোম" },
  { href: "/#latest", label: "সর্বশেষ" },
  { href: "/#live-insights", label: "তথ্যচিত্র" },
  { href: "/#pipeline", label: "যাচাই-পথ" },
  { href: "/#system-health", label: "সিস্টেম" },
];

function Wordmark({
  compact = false,
  engine = "broadcast",
}: {
  compact?: boolean;
  engine?: LogoEngine;
}) {
  return <BrandLogo format={compact ? "compact" : "full"} engine={engine} size={compact ? 34 : 38} />;
}

const ENGINE_BY_VARIANT: Record<string, LogoEngine> = {
  newsroom: "broadcast",
  glass: "signal",
  split: "cube",
  mono: "depth",
  stacked: "decode",
};

export default function Navbar({
  variant,
  engine,
}: {
  variant: string;
  engine?: LogoEngine;
}) {
  const logoEngine: LogoEngine = engine ?? ENGINE_BY_VARIANT[variant] ?? "broadcast";
  if (variant === "glass") return <GlassDock engine={logoEngine} />;
  if (variant === "split") return <SplitMega engine={logoEngine} />;
  if (variant === "mono") return <MinimalMono engine={logoEngine} />;
  if (variant === "stacked") return <StackedHeader engine={logoEngine} />;
  return <NewsroomClassic engine={logoEngine} />;
}

function useScrolled(threshold = 18) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function MobileDrawer({
  open,
  onClose,
  engine = "broadcast",
}: {
  open: boolean;
  onClose: () => void;
  engine?: LogoEngine;
}) {
  return (
    <div className={clsx("fixed inset-0 z-[80] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div
        onClick={onClose}
        className={clsx("absolute inset-0 bg-ink-950/85 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <div
        className={clsx(
          "absolute right-0 top-0 h-full w-[86%] max-w-sm border-l border-white/10 bg-ink-900 p-6 transition-transform duration-500",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <Wordmark engine={engine} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={onClose} className="rounded-lg border border-white/10 p-2 text-mist-300 hover:bg-white/5" aria-label="মেনু বন্ধ করুন">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={onClose}
              className="group flex items-center justify-between border-b border-white/6 py-3.5"
            >
              <span className="font-display-bn text-2xl text-mist-100 transition-colors group-hover:text-white">{n.label}</span>
              <span className="mono-label text-mist-400">{String(i + 1).padStart(2, "0")}</span>
            </Link>
          ))}
        </nav>
        <Link
          href="/admin"
          className="mt-8 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-ink-950"
          style={{ background: "var(--accent)" }}
        >
          <Settings2 className="h-4 w-4" /> অ্যাডমিন প্যানেল
        </Link>
      </div>
    </div>
  );
}

/* ── variant 1: newsroom classic ───────────────────────────── */
function NewsroomClassic({ engine = "broadcast" }: { engine?: LogoEngine }) {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-[60] transition-all duration-500",
          scrolled ? "border-b border-white/8 bg-ink-950/88 backdrop-blur-xl shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)]" : "border-b border-transparent bg-transparent",
        )}
      >
        <div className={clsx("mx-auto flex max-w-[1320px] items-center gap-6 px-5 transition-all duration-500 md:px-8", scrolled ? "py-2.5" : "py-4")}>
          <Wordmark compact={scrolled} engine={engine} />
          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => {
              const active = pathname === "/" && n.href === "/";
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={clsx(
                    "relative rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors",
                    active ? "text-mist-100" : "text-mist-400 hover:text-mist-100",
                  )}
                >
                  {n.label}
                  {active ? <span className="absolute inset-x-3.5 -bottom-0.5 h-px" style={{ background: "var(--accent)" }} /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <SearchButton className="hidden md:grid" />
            <Magnetic className="hidden sm:inline-block">
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-ink-950 transition-all hover:brightness-110"
                style={{ background: "var(--accent)" }}
              >
                <Settings2 className="h-3.5 w-3.5" /> অ্যাডমিন
              </Link>
            </Magnetic>
            <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-mist-200 lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <MobileDrawer open={open} onClose={() => setOpen(false)} engine={engine} />
    </>
  );
}

/* ── variant 2: glass dock ───────────────────────────── */
function GlassDock({ engine = "signal" }: { engine?: LogoEngine }) {
  const scrolled = useScrolled(40);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <div className="sticky top-0 z-[60] px-4 pt-4">
        <div
          className={clsx(
            "mx-auto flex max-w-4xl items-center gap-1 rounded-2xl border border-white/10 bg-ink-900/70 p-1.5 backdrop-blur-2xl transition-all duration-500",
            scrolled ? "shadow-[0_24px_70px_-40px_rgba(0,0,0,1)]" : "shadow-none",
          )}
        >
          <span className="rounded-xl px-3 py-2">
            <BrandLogo format="compact" engine={engine} size={30} />
          </span>
          <nav className="mx-auto hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => {
              const active = pathname === "/" && n.href === "/";
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={clsx(
                    "relative rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-all duration-300",
                    active ? "bg-white/10 text-mist-100" : "text-mist-400 hover:bg-white/5 hover:text-mist-100",
                  )}
                >
                  {n.label}
                  {active ? (
                    <span className="absolute inset-x-4 -bottom-px h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <span className="hidden items-center gap-1.5 rounded-xl px-2.5 py-2 sm:flex">
              <LiveDot />
              <span className="mono-label text-mist-400">সরাসরি</span>
            </span>
            <SearchButton className="rounded-xl" />
            <ThemeToggle className="rounded-xl" />
            <Link href="/admin" aria-label="প্রশাসন" className="grid h-9 w-9 place-items-center rounded-xl text-mist-300 transition-colors hover:bg-white/5 hover:text-mist-100">
              <Settings2 className="h-4 w-4" />
            </Link>
            <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl text-mist-200 md:hidden">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <MobileDrawer open={open} onClose={() => setOpen(false)} engine={engine} />
    </>
  );
}

/* ── variant 3: split mega ───────────────────────────── */
function SplitMega({ engine = "cube" }: { engine?: LogoEngine }) {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-[60]">
        <div className={clsx("border-b border-white/8 bg-ink-900/80 backdrop-blur-xl transition-all", scrolled && "bg-ink-950/92")}>
          <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-5 py-1.5 md:px-8">
            <span className="mono-label flex items-center gap-2 text-mist-400">
              <LiveDot /> সংগ্রহ পাইপলাইন সক্রিয়
            </span>
            <span className="ml-auto hidden items-center gap-4 md:flex">
              {CATEGORY_MIX.slice(0, 3).map((c) => (
                <span key={c.slug} className="mono-label text-mist-400">
                  {c.name} <span style={{ color: c.color }}>{bn(c.value)}</span>
                </span>
              ))}
              <Link href="/admin" className="mono-label text-mist-300 transition-colors hover:text-white">
                সম্পাদকীয় ডেস্ক ↗
              </Link>
            </span>
          </div>
        </div>
        <div className={clsx("border-b border-white/8 bg-ink-950/85 backdrop-blur-2xl transition-all duration-500", scrolled && "py-0")}>
          <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-5 py-3 md:px-8">
            <Wordmark engine={engine} />
            <nav className="ml-2 hidden items-center gap-5 lg:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="link-underline text-[14px] font-medium text-mist-300 hover:text-mist-100">
                  {n.label}
                </Link>
              ))}
              <button
                onMouseEnter={() => setMega(true)}
                onMouseLeave={() => setMega(false)}
                onClick={() => setMega((m) => !m)}
                className="flex items-center gap-1 text-[14px] font-medium text-mist-300 hover:text-mist-100"
              >
                ক্যাটাগরি <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", mega && "rotate-180")} />
              </button>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <SearchButton />
              <ThemeToggle />
              <Link href="/#latest" className="hidden rounded-full border border-white/12 px-4 py-2 text-[13px] font-medium text-mist-100 transition-colors hover:bg-white/5 sm:inline-flex">
                সর্বশেষ পড়ুন
              </Link>
              <Link href="/admin" className="rounded-full px-4 py-2 text-[13px] font-semibold text-ink-950" style={{ background: "var(--accent)" }}>
                ডেস্ক লঞ্চ
              </Link>
              <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-mist-200 lg:hidden">
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div
          onMouseEnter={() => setMega(true)}
          onMouseLeave={() => setMega(false)}
          className={clsx(
            "hidden overflow-hidden border-b border-white/8 bg-ink-900/95 backdrop-blur-2xl transition-all duration-400 lg:block",
            mega ? "max-h-72 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="mx-auto grid max-w-[1600px] grid-cols-6 gap-3 px-8 py-6">
            {CATEGORY_MIX.map((c) => (
              <Link
                key={c.slug}
                href={`/#cat-${c.slug}`}
                className="surface card-lift group rounded-xl p-4"
              >
                <span className="mono-label" style={{ color: c.color }}>
                  {c.tone}
                </span>
                <p className="mt-2 font-display-bn text-lg leading-snug text-mist-100">{c.name}</p>
                <p className="mt-2 flex items-center gap-1.5">
                  <Hash className="h-3 w-3 text-mist-400" />
                  <span className="mono-label text-mist-400">{bn(c.value)} রেকর্ড</span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      </header>
      <MobileDrawer open={open} onClose={() => setOpen(false)} engine={engine} />
    </>
  );
}

/* ── variant 4: minimal mono ───────────────────────────── */
function MinimalMono({ engine = "depth" }: { engine?: LogoEngine }) {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <header className={clsx("sticky top-0 z-[60] transition-all duration-500", scrolled ? "bg-ink-950/92 backdrop-blur-xl" : "bg-transparent")}>
        <div className="mx-auto flex max-w-[1180px] items-end justify-between gap-6 px-5 py-5 md:px-8">
          <BrandLogo format="full" engine={engine} size={38} subLabel="EST. 2024 · DHAKA" />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n, i) => {
              const active = pathname === "/" && n.href === "/";
              return (
                <Link key={n.href} href={n.href} className="group flex items-baseline gap-1.5">
                  <span className="mono-label text-mist-400 group-hover:text-mist-200">{String(i + 1).padStart(2, "0")}</span>
                  <span className={clsx("text-[14px] transition-colors", active ? "text-mist-100" : "text-mist-400 group-hover:text-mist-100")}>
                    {n.label}
                  </span>
                </Link>
              );
            })}
            <Link href="/admin" className="mono-label border-b pb-0.5 text-mist-200 transition-colors hover:text-white" style={{ borderColor: "var(--accent)" }}>
              সম্পাদকীয় ডেস্ক
            </Link>
            <SearchButton />
            <ThemeToggle />
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <SearchButton />
            <ThemeToggle />
            <button onClick={() => setOpen(true)} className="text-mist-200" aria-label="মেনু খুলুন">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-[1180px] px-5 md:px-8">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>
      </header>
      <MobileDrawer open={open} onClose={() => setOpen(false)} engine={engine} />
    </>
  );
}

function StackedHeader({ engine = "decode" }: { engine?: LogoEngine }) {
  const scrolled = useScrolled(24);
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-white/10 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3 md:px-8">
          <Wordmark compact={scrolled} engine={engine} />
          <span className="hidden h-7 w-px bg-white/10 md:block" />
          <p className="hidden text-[13px] text-mist-400 md:block">সংগৃহীত খবর · যাচাই করা তথ্য · পাঠকের অংশগ্রহণ</p>
          <div className="ml-auto flex items-center gap-2">
            <SearchButton />
            <ThemeToggle />
            <Link href="/admin" className="hidden rounded-full px-4 py-2 text-[13px] font-semibold text-ink-950 sm:inline-flex" style={{ background: "var(--accent)" }}>
              সম্পাদকীয় ডেস্ক
            </Link>
            <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-mist-200 lg:hidden" aria-label="মেনু খুলুন">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto border-t border-white/6 px-5 py-1.5 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item, i) => (
            <Link key={item.href} href={item.href} className="shrink-0 rounded-full px-4 py-2 text-[13.5px] text-mist-300 transition-colors hover:bg-white/[0.06] hover:text-mist-100">
              <span className="mono-label mr-2 text-mist-400">{String(i + 1).padStart(2, "0")}</span>{item.label}
            </Link>
          ))}
          <span className="mono-label ml-auto hidden shrink-0 items-center gap-2 text-mint-400 sm:flex"><LiveDot /> সরাসরি আপডেট</span>
        </nav>
      </header>
      <MobileDrawer open={open} onClose={() => setOpen(false)} engine={engine} />
    </>
  );
}

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import clsx from "clsx";
import {
  ArrowUpRight,
  Check,
  Database,
  GitBranch,
  Mail,
  MapPin,
  Rocket,
  Rss,
  Send,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { LiveDot } from "@/components/ui/primitives";
import { Marquee, LiveClock } from "@/components/ui/motion";
import BrandLogo, { type LogoEngine } from "@/components/ui/BrandLogo";
import { RUN_LOG, SERVICES } from "@/lib/data";
import { HOME_META } from "@/lib/content";
import { bn } from "@/lib/format";
import { playClick } from "@/lib/sound";
import { subscribe } from "@/lib/subscribe";

const COLS = [
  {
    title: "সেকশন",
    links: [
      { label: "সর্বশেষ সংগ্রহ", href: "/#latest" },
      { label: "লাইভ ইনসাইটস", href: "/#live-insights" },
      { label: "অটোমেশন পাইপলাইন", href: "/#pipeline" },
      { label: "সিস্টেম হেলথ", href: "/#system-health" },
    ],
  },
  {
    title: "ডেস্ক",
    links: [
      { label: "অ্যাডমিন কনসোল", href: "/admin" },
      { label: "ফ্যাক্ট-গেট নীতি", href: "/#pipeline" },
      { label: "সম্পাদকীয় নীতি", href: "/#newsletter" },
      { label: "ডুপ্লিকেট গেট", href: "/#live-insights" },
    ],
  },
  {
    title: "সংযোগ",
    links: [
      { label: "ডেটা API", href: "/api/sections" },
      { label: "RSS ফিড", href: "/#latest" },
      { label: "নিউজলেটার", href: "/#newsletter" },
      { label: "যোগাযোগ", href: "/#newsletter" },
    ],
  },
];

const FOOTER_ENGINE: Record<string, LogoEngine> = {
  mega: "crt",
  slab: "neon",
  linkgrid: "hologram",
  terminal: "boot",
  compact: "led",
};

export default function Footer({ variant, engine }: { variant: string; engine?: LogoEngine }) {
  const logoEngine: LogoEngine = engine ?? FOOTER_ENGINE[variant] ?? "crt";
  if (variant === "slab") return <Slab engine={logoEngine} />;
  if (variant === "linkgrid") return <LinkGrid engine={logoEngine} />;
  if (variant === "terminal") return <TerminalLog engine={logoEngine} />;
  if (variant === "compact") return <CompactFooter engine={logoEngine} />;
  return <Mega engine={logoEngine} />;
}

/* ───────────── shared pieces ───────────── */

function FooterMail() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    setMsg("");
    const r = await subscribe(email, "footer");
    if (r.ok) {
      playClick(880);
      setState("done");
      setMsg(r.already ? "এই ইমেইল আগেই যুক্ত আছে" : "যুক্ত হয়েছে — ধন্যবাদ!");
      setEmail("");
    } else {
      setState("error");
      setMsg(r.error ?? "সম্পন্ন করা যায়নি");
    }
  };
  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className="flex w-full items-center gap-2">
        <label className="footer-chip flex flex-1 items-center gap-2 rounded-full px-3.5 py-2.5">
          <Mail className="h-4 w-4 shrink-0 text-mist-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            placeholder="আপনার ইমেইল"
            aria-label="ইমেইল ঠিকানা"
            className="w-full bg-transparent text-[13.5px] text-mist-100 outline-none placeholder:text-mist-400"
          />
        </label>
        <button
          type="submit"
          disabled={state === "busy"}
          className="sheen flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink-950 transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          {state === "busy" ? "পাঠানো হচ্ছে…" : state === "done" ? "যুক্ত হয়েছে" : "সাবস্ক্রাইব"}
        </button>
      </form>
      <p aria-live="polite" className={clsx("mt-1.5 min-h-[1rem] pl-2 text-[12px]", state === "error" ? "text-rose-400" : "text-mint-400")}>{msg}</p>
    </div>
  );
}

function SocialRow() {
  const items = [
    { Icon: Code2, href: "/admin", label: "রিপোজিটরি" },
    { Icon: Send, href: "/#newsletter", label: "নিউজলেটার" },
    { Icon: Rss, href: "/#latest", label: "আরএসএস ফিড" },
  ];
  return (
    <div className="flex items-center gap-2">
      {items.map(({ Icon, href, label }) => (
        <Link
          key={label}
          href={href}
          title={label}
          aria-label={label}
          className="footer-chip grid h-9 w-9 place-items-center rounded-full text-mist-300 transition-all hover:-translate-y-0.5 hover:text-mist-100"
        >
          <Icon className="h-4 w-4" />
        </Link>
      ))}
    </div>
  );
}

function StatusRow() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
      {SERVICES.slice(0, 4).map((s) => (
        <span key={s.name} className="flex items-center gap-2">
          <LiveDot tone={s.status === "operational" ? "ok" : s.status === "degraded" ? "warn" : "cool"} />
          <span className="text-[12.5px] text-mist-400">{s.name}</span>
          <span className="mono-label text-mist-300">{bn(s.uptime)}%</span>
        </span>
      ))}
    </div>
  );
}

function LegalBar() {
  return (
    <div className="footer-rule mt-6 flex flex-col items-start justify-between gap-3 border-t pt-5 md:flex-row md:items-center">
      <p className="text-[12.5px] text-mist-400">
        © {bn(new Date().getFullYear())} হৈচৈ · ফিড থেকে সংগ্রহ, যাচাই শেষে প্রকাশ।
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <span className="mono-label flex items-center gap-1.5 text-mist-400">
          <MapPin className="h-3 w-3" /> ঢাকা, বাংলাদেশ
        </span>
        <LiveClock className="mono-label text-mist-400" />
      </div>
    </div>
  );
}

/* ───────────── variant 1 · newsroom mega ───────────── */
function Mega({ engine = "crt" }: { engine?: LogoEngine }) {
  return (
    <footer className="footer-root relative mt-10 overflow-hidden">
      <div aria-hidden className="footer-divider pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div aria-hidden className="dot-bg pointer-events-none absolute inset-0 opacity-30 mask-fade-b" />

      <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-8 md:py-20">
        {/* masthead + newsletter */}
        <div className="footer-panel flex flex-col gap-8 rounded-3xl p-7 md:flex-row md:items-center md:justify-between md:p-9">
          <div className="max-w-md">
            <BrandLogo format="masthead" engine={engine} size={38} showTagline />
            <p className="mt-4 text-[14px] leading-relaxed text-mist-400">
              শহর ফিডে যা বলে, আমরা তা যাচাই করে লিখি। প্রতিটি প্রতিবেদনে থাকে হ্যাশ-স্ট্যাম্প, ফ্যাক্ট-গেট স্কোর আর
              মানুষের রিভিউ লগ।
            </p>
          </div>
          <div className="md:text-right">
            <p className="mono-label mb-3 text-mist-400">দৈনিক ডাইজেস্ট · সকাল ৭টা</p>
            <FooterMail />
            <p className="mono-label mt-3 text-mist-400">
              ইতিমধ্যে <span className="text-mist-200">{bn(4280)}</span> জন সাবস্ক্রাইবার
            </p>
          </div>
        </div>

        {/* link columns */}
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mono-label mb-4" style={{ color: "var(--accent)" }}>
              পাইপলাইন
            </p>
            <p className="mono-label leading-relaxed text-mist-400">{HOME_META.pipelineChain}</p>
            <div className="mt-5">
              <SocialRow />
            </div>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <p className="mono-label mb-4" style={{ color: "var(--accent)" }}>
                {c.title}
              </p>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-1.5 text-[14px] text-mist-400 transition-colors hover:text-mist-100"
                    >
                      <span className="h-px w-0 transition-all duration-300 group-hover:w-3" style={{ background: "var(--accent)" }} />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* status */}
        <div className="footer-rule mt-12 flex flex-col gap-5 border-t pt-7 lg:flex-row lg:items-center lg:justify-between">
          <StatusRow />
          <Link
            href="/admin"
            className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-mist-200 transition-colors hover:text-mist-100"
          >
            সম্পাদকীয় ডেস্ক
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <LegalBar />
      </div>
    </footer>
  );
}

/* ───────────── variant 2 · minimal slab ───────────── */
function Slab({ engine = "neon" }: { engine?: LogoEngine }) {
  return (
    <footer className="footer-root mt-16">
      <div className="mx-auto max-w-[1100px] px-5 py-14 text-center md:px-8">
        <div className="flex justify-center">
          <BrandLogo format="stacked" engine={engine} size={46} />
        </div>
        <p className="mx-auto mt-5 max-w-lg text-[14.5px] leading-relaxed text-mist-400">
          {HOME_META.tagline}
        </p>

        <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {[...COLS[0].links, ...COLS[1].links.slice(0, 2)].map((l) => (
            <Link key={l.label} href={l.href} className="link-underline text-[14px] text-mist-400 hover:text-mist-100">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mt-9 flex justify-center">
          <FooterMail />
        </div>

        <div className="footer-divider mx-auto mt-10 h-px w-full max-w-xl" />

        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-[12.5px] text-mist-400 md:flex-row md:gap-6">
          <span className="mono-label">{HOME_META.pipelineChain}</span>
          <span>© {bn(new Date().getFullYear())} হৈচৈ নিউজরুম</span>
          <LiveClock className="mono-label" />
        </div>
      </div>
    </footer>
  );
}

/* ───────────── variant 3 · link grid ───────────── */
function LinkGrid({ engine = "hologram" }: { engine?: LogoEngine }) {
  return (
    <footer className="footer-root mt-16">
      <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="footer-panel rounded-2xl p-6">
            <BrandLogo format="full" engine={engine} size={40} />
            <p className="mt-4 text-[13.5px] leading-relaxed text-mist-400">{HOME_META.tagline}</p>
            <div className="mt-5">
              <SocialRow />
            </div>
          </div>

          {COLS.map((c) => (
            <div key={c.title} className="footer-panel rounded-2xl p-6">
              <p className="mono-label mb-4 text-mist-300">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group flex items-center justify-between gap-2 text-[14px] text-mist-400 transition-colors hover:text-mist-100"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-panel mt-4 flex flex-col items-start justify-between gap-5 rounded-2xl p-6 lg:flex-row lg:items-center">
          <StatusRow />
          <FooterMail />
        </div>

        <LegalBar />
      </div>
    </footer>
  );
}

/* ───────────── variant 4 · terminal log ───────────── */
function TerminalLog({ engine = "boot" }: { engine?: LogoEngine }) {
  return (
    <footer className="footer-root relative mt-16 overflow-hidden">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-25" />
      <div className="relative mx-auto max-w-[1320px] px-5 py-14 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <BrandLogo format="full" engine={engine} size={40} />
          <span className="mono-label flex items-center gap-2 text-mint-400">
            <LiveDot /> সিস্টেম স্বাভাবিক
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
          <div className="footer-panel rounded-2xl p-5">
            <div className="footer-rule mb-4 flex items-center gap-2 border-b pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-mint-400/80" />
              <span className="mono-label ml-2 text-mist-400">সর্বশেষ রান-লগ</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11.5px] leading-relaxed">
              {RUN_LOG.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-mist-400">
                  <span className="opacity-70">{r.at}</span>
                  <span className="text-mist-200">{r.step}</span>
                  <span>{bn(r.items)} রেকর্ড</span>
                  <span className="ml-auto" style={{ color: r.ok ? "#22c55e" : "#fb7185" }}>
                    {r.ok ? "OK" : "FAIL"}
                  </span>
                  <span className="opacity-60">{r.dur}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mono-label mb-4 text-mist-300">পরিচালন তথ্য</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { Icon: Database, k: "টার্সো ডাটাবেস", val: "edge replica · connected" },
                { Icon: ShieldCheck, k: "ফ্যাক্ট-গেট", val: "threshold 0.90 · bangla v2.4" },
                { Icon: GitBranch, k: "গিট কমিট বট", val: "content/*.json · signed" },
                { Icon: Rocket, k: "আইএসআর ডিপ্লয়", val: "~8s revalidate" },
              ].map(({ Icon, k, val }) => (
                <div key={k} className="footer-panel card-lift rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                    <span className="mono-label text-mist-200">{k}</span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-mist-400">{val}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <FooterMail />
            </div>
          </div>
        </div>

        <div className="footer-rule mask-fade-r mt-10 overflow-hidden border-y py-3">
          <Marquee speed="slow">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="mono-label whitespace-nowrap px-6 text-mist-400">
                {HOME_META.pipelineChain} · {HOME_META.tagline} · ঢাকা · {bn(new Date().getFullYear())}
              </span>
            ))}
          </Marquee>
        </div>

        <LegalBar />
      </div>
    </footer>
  );
}

/* ───────────── variant 5 · reader support ───────────── */
function CompactFooter({ engine = "led" }: { engine?: LogoEngine }) {
  return (
    <footer className="footer-root mt-16">
      <div className="mx-auto max-w-[1320px] px-5 py-11 md:px-8">
        <div className="flex flex-col items-center justify-between gap-7 lg:flex-row lg:items-start">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <BrandLogo format="compact" engine={engine} size={36} />
            </div>
            <p className="mt-3 text-[13.5px] text-mist-400">{HOME_META.tagline}</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {[...COLS[0].links.slice(0, 3), ...COLS[2].links.slice(0, 2)].map((l) => (
              <Link key={l.label} href={l.href} className="link-underline text-[13.5px] text-mist-400 hover:text-mist-100">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-3 lg:items-end">
            <SocialRow />
            <LiveClock className="mono-label text-mist-400" />
          </div>
        </div>

        <LegalBar />
      </div>
    </footer>
  );
}

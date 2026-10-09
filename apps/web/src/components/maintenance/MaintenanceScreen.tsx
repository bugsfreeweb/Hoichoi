"use client";

import { useEffect, useMemo, useState } from "react";
import type { MaintenanceSiteConfig } from "@hoichoi/shared-types";
import "./maintenance.css";

/**
 * Public maintenance screen — faithful to the `maintenance-page-mockup`
 * "editorial" theme, rebuilt inside the real app on the real design tokens
 * (paper/ink/alizarin/lime). Rendered by the (site) layout while
 * `maintenance_mode` is on, and again as a live preview inside the admin
 * settings "রক্ষণাবেক্ষণ" tab.
 */

export interface MaintenanceStats {
  collectedToday: number;
  published: number;
  duplicates: number;
  pendingComments: number;
}

const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function bn(n: number | string, locale: "bn" | "en"): string {
  const s = String(n);
  if (locale !== "bn") return s;
  return s.replace(/[0-9]/g, (d) => BN[Number(d)] ?? d);
}

/** Deterministic PRNG so server markup and client hydration always match. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const PIPELINE = [
  { bn: "ফেসবুক ওয়াচলিস্ট", en: "Facebook watchlist", sub: "GRAPH READ" },
  { bn: "ডেস্কটপ কালেক্টর", en: "Desktop collector", sub: "PLAYWRIGHT SHOT" },
  { bn: "ডুপ্লিকেট গেট", en: "Duplicate gate", sub: "SHA-256 × SIMHASH" },
  { bn: "পুনর্লিখন ডেস্ক", en: "Rewrite desk", sub: "LLM + FACT-GATE" },
  { bn: "AI ইঞ্জিন কমিট", en: "AI engine commit", sub: "CONTENT/*.JSON" },
  { bn: "Web লাইভ", en: "Web live", sub: "ISR · ~৮ সে" },
] as const;

const STR = {
  bn: {
    notifyMe: "জানিয়ে দিন",
    email: "ইমেইল",
    invalidEmail: "সঠিক ইমেইল ঠিকানা দিন।",
    subscribed: "তালিকায় উঠে গেছেন — প্রথম পাতায় দেখা হচ্ছে।",
    already: "এই ইমেইলটি আগেই তালিকায় আছে।",
    yourName: "আপনার নাম",
    howHelp: "অফলাইন থাকাকালীন কীভাবে সাহায্য করতে পারি?",
    send: "পাঠান",
    replyDay: "সাধারণত এক কর্মদিবসে উত্তর দিই।",
    sentOk: "ধন্যবাদ — বার্তা আমাদের ইনবক্সে পৌঁছেছে।",
    collected: "আজ সংগৃহীত",
    published: "প্রকাশিত প্রতিবেদন",
    duplicates: "ডুপ্লিকেট চিহ্নিত",
    pendingComments: "অপেক্ষমান মন্তব্য",
    days: "দিন",
    hours: "ঘণ্টা",
    minutes: "মিনিট",
    seconds: "সেকেন্ড",
    timeRemaining: "বাকি সময়",
    backOnline: "ফিরছি",
    lastRun: "সর্বশেষ নথিভুক্ত রান",
    pipelineTitle: "ফিড থেকে লাইভ — ছয় ধাপ, শূন্য ছোঁয়া",
    health: "পাইপলাইন হেলথ",
    turso: "TURSO ডাটাবেস",
    api: "পাবলিক ডেটা API",
    collector: "ডেস্কটপ কালেক্টর",
    adminHint: "অ্যাডমিন? লগ ইন করলে সাইট খোলা দেখতে পাবেন",
    helpline: "সহায়তা লাইন",
  },
  en: {
    notifyMe: "Notify me",
    email: "Email",
    invalidEmail: "Please enter a valid email address.",
    subscribed: "You're on the list. See you on the front page.",
    already: "This email is already on the list.",
    yourName: "Your name",
    howHelp: "How can we help while we're offline?",
    send: "Send",
    replyDay: "We usually reply within one business day.",
    sentOk: "Thanks — your message landed in our inbox.",
    collected: "Collected today",
    published: "Published reports",
    duplicates: "Duplicates flagged",
    pendingComments: "Pending comments",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    timeRemaining: "Time remaining",
    backOnline: "Back online",
    lastRun: "Last recorded run",
    pipelineTitle: "Feed to live — six steps, zero touch",
    health: "Pipeline health",
    turso: "TURSO database",
    api: "Public data API",
    collector: "Desktop collector",
    adminHint: "Are you an admin? Sign in to keep reading",
    helpline: "Helpline",
  },
} as const;

type L = keyof typeof STR;

function nowParts(target: number) {
  const diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

export function MaintenanceScreen({
  config,
  stats = null,
  lastRunIso = null,
  preview = false,
}: {
  config: MaintenanceSiteConfig;
  stats?: MaintenanceStats | null;
  lastRunIso?: string | null;
  preview?: boolean;
}) {
  const L: L = config.language === "en" ? "en" : "bn";
  const T = STR[L];
  const copy = config.language === "en" ? config.copyEn : config.copyBn;
  const ticker = config.language === "en" ? config.tickerEn : config.tickerBn;
  const brand = config.language === "en" ? config.brand.name : config.brand.nameBn;

  const [remaining, setRemaining] = useState(() =>
    config.countdown.enabled && config.countdown.target
      ? nowParts(new Date(config.countdown.target).getTime())
      : null,
  );

  useEffect(() => {
    if (!config.countdown.enabled || !config.countdown.target) return;
    const target = new Date(config.countdown.target).getTime();
    if (Number.isNaN(target)) return;
    setRemaining(nowParts(target));
    const id = setInterval(() => setRemaining(nowParts(target)), 1000);
    return () => clearInterval(id);
  }, [config.countdown.enabled, config.countdown.target]);

  const dust = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: r() * 100,
      size: 1.5 + r() * 3,
      dur: 7 + r() * 8,
      delay: r() * 10,
      dx: (r() - 0.5) * 220,
    }));
  }, []);

  return (
    <div
      className={`mc-root ${config.effects.grain ? "mc-grain" : ""} ${preview ? "mc-paused" : ""}`}
      style={
        {
          background: config.colors.bg,
          "--mc-bg": config.colors.bg,
          "--mc-surface": config.colors.surface,
          "--mc-text": config.colors.text,
          "--mc-primary": config.colors.primary,
          "--mc-accent": config.colors.accent,
        } as React.CSSProperties
      }
    >
      {config.effects.particles && (
        <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
          {dust.map((p) => (
            <span
              key={p.id}
              className="mc-dust"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
                ["--mc-dur" as string]: `${p.dur}s`,
                ["--mc-dx" as string]: `${p.dx}px`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-[6] min-h-[100dvh]">
        {/* ===== breaking/ticker band ===== */}
        <div className="flex items-center gap-3 overflow-hidden px-4 py-2" style={{ background: config.colors.text }}>
            <span
              className="shrink-0 font-mono-x text-[9px] font-bold tracking-[0.22em] text-white uppercase"
              style={{ color: config.colors.accent }}
            >
              • {copy.badge}
            </span>
            <div className="mc-mask overflow-hidden">
              <div className="mc-marquee flex shrink-0 items-center gap-10 whitespace-nowrap font-mono-x text-[9.5px] tracking-[0.18em] text-white/90 uppercase">
                {[0, 1].map((k) => (
                  <span key={k} className="flex items-center gap-10">
                    {[...ticker, ...(ticker.length ? [] : [T.backOnline])].map((item, i) => (
                      <span key={i} className="flex items-center gap-10">
                        <span>{item}</span>
                        <span aria-hidden="true" style={{ color: config.colors.accent }}>
                          ◆
                        </span>
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </div>

        {/* ===== masthead ===== */}
        <header className="border-b-2" style={{ borderColor: config.colors.text }}>
          <div className="mc-wrap flex items-center justify-between gap-4 px-5 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-lg font-serif-bn text-[22px] font-black text-white md:h-12 md:w-12 md:text-[24px]"
                style={{ background: config.colors.primary }}
              >
                {config.brand.mark || "হ"}
              </span>
              <div>
                <p className="font-serif-bn text-[19px] leading-none font-black md:text-[22px]">{brand}</p>
                <p className="mt-1 font-mono-x text-[8px] tracking-[0.26em] text-white/0 uppercase" style={{ color: "transparent" }}>
                  &nbsp;
                </p>
                <p className="font-mono-x text-[8.5px] tracking-[0.22em] uppercase" style={{ color: "color-mix(in srgb, var(--mc-text) 55%, transparent)" }}>
                  ASIA/UTC+6 · BUGSFREE STUDIO
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: "color-mix(in srgb, var(--mc-text) 20%, transparent)" }}>
              <span className="mc-live-dot h-2 w-2 rounded-full" style={{ background: config.colors.accent, color: config.colors.accent, display: "inline-block" }}></span>
              <span className="font-mono-x text-[9px] font-bold tracking-[0.2em] uppercase">{T.backOnline}</span>
            </div>
          </div>
        </header>

        {/* ===== hero ===== */}
        <section className="mc-wrap relative overflow-hidden px-5 pt-12 pb-10 md:px-8 md:pt-16 md:pb-12">
          <span className="font-mono-x text-[10px] font-bold tracking-[0.3em] uppercase" style={{ background: config.colors.primary, color: "#fff", padding: "4px 10px", borderRadius: 4 }}>
            {copy.badge}
          </span>
          <h1 className="mt-5 max-w-3xl font-serif-bn text-[38px] leading-[1.08] font-black md:text-[58px]">
            {copy.headline}
          </h1>
          <p className="mt-4 max-w-2xl font-sans-bn text-[16px] font-semibold md:text-[19px]" style={{ color: "color-mix(in srgb, var(--mc-text) 78%, transparent)" }}>
            {copy.subheadline}
          </p>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed md:text-[15px] mc-ink-soft">{copy.body}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {config.showNewsletter && (
              <a
                href="#subscribe"
                className="mc-primary-btn rounded-lg px-5 py-2.5 font-sans-bn text-[14px] font-bold"
              >
                {T.notifyMe} ↘
              </a>
            )}
            {config.contactEmail && (
              <a
                href={`mailto:${config.contactEmail}`}
                className="mc-accent-btn rounded-lg px-5 py-2.5 font-sans-bn text-[14px] font-bold"
              >
                {config.contactPhone ? `${T.helpline} · ${config.contactPhone}` : STR[L].email}
              </a>
            )}
          </div>

          {/* health strip */}
          <div className="mc-surface mt-10 inline-grid w-full max-w-2xl gap-y-3 rounded-xl px-4 py-3 md:grid-cols-3 md:gap-x-6">
            {(
              [
                [T.turso, "TURSO"],
                [T.api, "API"],
                [T.collector, lastRunIso ? "OK" : "SLEEP"],
              ] as const
            ).map(([label, id]) => (
              <span key={id} className="flex items-center gap-2 text-[11.5px]">
                <span className="mc-live-dot h-1.5 w-1.5 rounded-full" style={{ background: config.colors.primary, color: config.colors.primary, display: "inline-block" }}></span>
                <span className="font-bold">{label}</span>
                <span className="mc-ink-faint font-mono-x text-[9px] tracking-[0.16em] uppercase">{id}</span>
              </span>
            ))}
          </div>

          {lastRunIso && stats && (
            <p className="mt-3 font-mono-x text-[9px] tracking-[0.18em] uppercase mc-ink-faint">
              {T.lastRun} · {bhTime(lastRunIso)} · {bn(stats.published, L)} {T.published}
            </p>
          )}
        </section>

        {/* ===== countdown + progress ===== */}
        {(config.countdown.enabled && remaining) || config.progress.enabled ? (
          <section className="mc-wrap pb-12 md:px-8">
            <div className="grid gap-6 md:grid-cols-2">
              {config.countdown.enabled && remaining && (
                <div className="mc-surface rounded-xl p-5">
                  <p className="font-mono-x text-[9px] tracking-[0.26em] uppercase mc-ink-faint">{T.timeRemaining}</p>
                  <div className="mt-3 flex gap-2">
                    {(
                      [
                        [remaining.d, T.days],
                        [remaining.h, T.hours],
                        [remaining.m, T.minutes],
                        [remaining.s, T.seconds],
                      ] as const
                    ).map(([v, label]) => (
                      <div key={label} className="flex-1 rounded-lg border text-center py-2.5" style={{ borderColor: "color-mix(in srgb, var(--mc-text) 16%, transparent)" }}>
                        <p className="font-serif-bn text-[22px] leading-none font-black mc-tnum">{bn(v, L)}</p>
                        <p className="mt-1 font-mono-x text-[8px] tracking-[0.14em] uppercase mc-ink-soft">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {config.progress.enabled && (
                <div className="mc-surface rounded-xl p-5 flex flex-col justify-center">
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono-x text-[9px] tracking-[0.26em] uppercase mc-ink-faint">{T.backOnline}</p>
                    <p className="font-serif-bn text-[26px] leading-none font-black">{bn(Math.round(config.progress.value), L)}%</p>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--mc-text) 18%, transparent)", background: "color-mix(in srgb, var(--mc-text) 8%, transparent)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, config.progress.value))}%`, background: config.colors.accent }}
                    />
                  </div>
                  <p className="mt-3 font-mono-x text-[9px] tracking-[0.18em] uppercase mc-ink-faint">
                    FEED → SHOT → HASH → LLM → GIT → DEPLOY
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* ===== pipeline + stats + forms ===== */}
        <section className="mc-wrap pb-14 md:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {config.showPipeline && (
              <div className="mc-surface rounded-xl p-6">
                <p className="font-mono-x text-[9px] tracking-[0.26em] uppercase mc-ink-faint">{T.pipelineTitle}</p>
                <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5">
                  {PIPELINE.map((p, i) => (
                    <div key={i} className="relative">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono-x text-[8px] font-bold" style={{ borderColor: "color-mix(in srgb, var(--mc-text) 30%, transparent)" }}>
                          {bn(i + 1, L)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12.5px] leading-tight font-bold">{L === "bn" ? p.bn : p.en}</p>
                          <p className="mt-0.5 font-mono-x text-[8px] tracking-[0.1em] uppercase mc-ink-faint">{p.sub}</p>
                        </div>
                      </div>
                      {i < PIPELINE.length - 1 && (
                        <span className="mc-pipe-line absolute top-2 left-4 hidden -right-3 lg:block" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.showStats && stats && (
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    [T.collected, stats.collectedToday],
                    [T.published, stats.published],
                    [T.duplicates, stats.duplicates],
                    [T.pendingComments, stats.pendingComments],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="mc-surface rounded-xl p-5">
                    <p className="font-mono-x text-[9px] tracking-[0.2em] uppercase mc-ink-faint">{label}</p>
                    <p className="mt-2 font-serif-bn text-[36px] leading-none font-black mc-tnum">{bn(value, L)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* newsletter + contact */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {config.showNewsletter && (
              <NewsletterShell config={config} L={L} />
            )}
            {config.showContact && (
              <ContactShell config={config} L={L} />
            )}
          </div>
        </section>

        {/* ===== footer ===== */}
        <footer className="border-t-2" style={{ borderColor: config.colors.text }}>
          <div className="mc-wrap flex flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-8">
            <p className="font-mono-x text-[9px] tracking-[0.2em] uppercase mc-ink-soft">
              {tail(config)}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {config.socialsEnabled &&
                SOC_LINKS.filter((s) => config.socials[s.key]).map((s) => (
                  <a
                    key={s.key}
                    href={config.socials[s.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full border font-mono-x text-[10px] font-bold hover:border-current"
                    style={{ borderColor: "color-mix(in srgb, var(--mc-text) 18%, transparent)" }}
                    aria-label={s.key}
                  >
                    {s.glyph}
                  </a>
                ))}
              <a
                href="/admin"
                className="rounded-full border font-mono-x text-[9px] tracking-[0.16em] uppercase px-3 py-1.5 hover:border-current"
                style={{ borderColor: "color-mix(in srgb, var(--mc-text) 25%, transparent)" }}
                title={strAdmin(L)}
              >
                {L === "bn" ? "অ্যাডমিন" : "ADMIN"} ↗
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

const SOC_LINKS = [
  { key: "facebook", glyph: "f" },
  { key: "x", glyph: "𝕏" },
  { key: "instagram", glyph: "◎" },
  { key: "youtube", glyph: "▶" },
  { key: "github", glyph: "⌥" },
  { key: "linkedin", glyph: "in" },
] as const;

function tail(config: MaintenanceSiteConfig): string {
  return config.language === "en" ? config.footerNoteEn : config.footerNoteBn;
}

function strAdmin(L: L): string {
  return L === "bn" ? "অ্যাডমিন লগইন" : "Admin sign in";
}

function bhTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("bn-BD", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function NewsletterShell({ config, L }: { config: MaintenanceSiteConfig; L: L }) {
  const T = STR[L];
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<null | "ok" | "dup" | "err">(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/maintenance/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale: config.language }),
      });
      const data = (await res.json()) as { ok: boolean; status?: string };
      if (!res.ok) {
        setNote(data.status === "duplicate" ? "dup" : "err");
      } else {
        setNote("ok");
        setEmail("");
      }
    } catch {
      setNote("err");
    } finally {
      setBusy(false);
    }
  };



  return (
    <div id="subscribe" className={`mc-surface rounded-xl p-6 ${config.effects.particles ? "relative overflow-hidden" : ""}`}>
      <p className="mc-live-dot font-sans-bn text-[15px] font-bold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span className="h-2 w-2 rounded-full" style={{ background: config.colors.accent }}></span>
        {L === "bn" ? "ফিরে এলে জানিয়ে দেব" : "Get notified when we're back"}
      </p>
      <p className="mt-1.5 text-[12px] mc-ink-soft">
        {L === "bn" ? config.newsletterNoteBn : config.newsletterNoteEn}
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-lg border bg-transparent px-3 py-2.5 text-[13px] outline-none focus:border-current"
          style={{ borderColor: "color-mix(in srgb, var(--mc-text) 22%, transparent)" }}
        />
        <button
          type="submit"
          disabled={busy}
          className="mc-primary-btn rounded-lg px-5 py-2.5 text-[13px] font-bold disabled:opacity-60"
        >
          {busy ? "…" : T.notifyMe}
        </button>
      </form>
      {note && (
        <p
          className="mt-3 text-[12px] font-bold"
          style={{ color: note === "ok" ? "color-mix(in srgb, var(--mc-accent) 60%, var(--mc-text))" : note === "dup" ? "var(--mc-primary)" : "var(--mc-text)" }}
        >
          {note === "ok" ? T.subscribed : note === "dup" ? T.already : T.invalidEmail}
        </p>
      )}
    </div>
  );
}

function ContactShell({ config, L }: { config: MaintenanceSiteConfig; L: L }) {
  const T = STR[L];
  const [form, setForm] = useState({ name: "", email: "", body: "" });
  const [note, setNote] = useState<null | "ok" | "err">(null);
  const [busy, setBusy] = useState(false);

  const field =
    "w-full rounded-lg border bg-transparent px-3 py-2.5 text-[13px] outline-none focus:border-current";
  const border = "color-mix(in srgb, var(--mc-text) 22%, transparent)";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/maintenance/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale: config.language }),
      });
      if (!res.ok) throw new Error("err");
      setNote("ok");
      setForm({ name: "", email: "", body: "" });
    } catch {
      setNote("err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mc-surface rounded-xl p-6">
      <p className="font-sans-bn text-[15px] font-bold">{T.howHelp}</p>
      <p className="mt-1.5 text-[12px] mc-ink-soft">{T.replyDay}</p>
      <form onSubmit={submit} className="mt-4 space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={T.yourName}
            className={field}
            style={{ borderColor: border }}
          />
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={T.email}
            className={field}
            style={{ borderColor: border }}
          />
        </div>
        <textarea
          required
          rows={3}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className={`${field} resize-y leading-relaxed`}
          style={{ borderColor: border }}
        />
        <div className="flex items-center justify-end gap-3">
          {note && (
            <span className="text-[12px] font-bold" style={{ color: note === "ok" ? "var(--mc-primary)" : "var(--mc-text)" }}>
              {note === "ok" ? T.sentOk : T.invalidEmail}
            </span>
          )}
          <button type="submit" disabled={busy} className="mc-accent-btn rounded-lg px-5 py-2.5 text-[13px] font-bold disabled:opacity-60">
            {busy ? "…" : `${T.send} →`}
          </button>
        </div>
      </form>
    </div>
  );
}
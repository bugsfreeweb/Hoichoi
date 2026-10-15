"use client";

import type { SiteSettings } from "@/lib/types";
import { INTENSITY_SCALE, PIPELINE_STRIP, bnNum, copyFor, loc, t } from "@/lib/types";
import { ContactForm, ContactRow, Countdown, Progress, SocialRow, stageVars } from "@/components/blocks";
import {
  BreakingBand,
  Eyebrow,
  HashStamp,
  HoiCountdown,
  HoiLogo,
  HoiNewsletter,
  HoiTicker,
  PipelineSteps,
  PipelineStrip,
  StatQuartet,
  StatusGrid,
} from "@/components/hoichoi";
import {
  Dust,
  MatrixRain,
  Meteors,
  Reveal,
  Scramble,
  Spotlight,
  Starfield,
  Tilt,
  Typewriter,
  useParallax,
} from "@/components/fx";

/* ============================ 1. FRONT PAGE (flagship) ============================ */

export function EditorialTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const eta = new Date(s.countdown.target);
  return (
    <div className="mc-stage font-sans-bn" style={stageVars(s, { background: "#f3eee1" })}>
      <div className="hoi-paper absolute inset-0" />
      <div className="hoi-halftone pointer-events-none absolute inset-y-0 right-0 w-[22%] opacity-40" />
      {s.effects.spotlight && <Spotlight color="#d2202c" />}

      <div className="relative z-10 flex h-full flex-col">
        <BreakingBand s={s} />
        {s.hoichoi.showTicker && s.effects.marquee && <HoiTicker s={s} />}

        <header className="flex items-center justify-between px-[4cqw] py-[1.8cqw] max-lg:px-5 max-lg:py-3">
          <HoiLogo s={s} />
          <div className="text-right">
            <p className="font-mono-x text-[9px] tracking-[0.28em] text-[#6b6250] uppercase">
              {L === "bn" ? "সাপ্তাহিক সংস্করণ" : "Weekly edition"} · {bnNum(eta.getFullYear(), L)}
            </p>
            <p className="font-mono-x mt-1 text-[9px] tracking-[0.28em] text-[#d2202c] uppercase">
              {copy.badge}
            </p>
          </div>
        </header>
        <div className="hoi-rule-double mx-[4cqw] max-lg:mx-5" />

        <div className="flex flex-1 flex-col overflow-y-auto px-[4cqw] py-[1.6cqw] max-lg:px-5">
          <div className="my-auto grid w-full gap-[2.6cqw] lg:grid-cols-12 max-lg:gap-8">
            <div className="lg:col-span-8">
              <Eyebrow>{L === "bn" ? "লিড স্টোরি · এই সিঙ্কের প্রধান কনটেন্ট" : "Lead story · this sync's top content"}</Eyebrow>
              <h1
                className="mc-mask font-serif-bn mt-3 font-extrabold tracking-tight text-[#1a140d]"
                style={{ fontSize: "clamp(2rem, 5.6cqw, 5.2rem)", lineHeight: 1.04 }}
              >
                {copy.headline}
              </h1>
              <p className="font-sans-bn mt-4 flex items-center gap-2 text-[1.4cqw] max-lg:text-sm font-semibold text-[#d2202c]">
                <span className="inline-block h-px w-10 bg-[#d2202c]" />
                {copy.subheadline}
              </p>
              <p className="mt-4 max-w-xl text-[1.35cqw] max-lg:text-sm leading-relaxed text-[#1a140d]/70">
                {copy.body}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <HashStamp s={s} />
                <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-[#6b6250] uppercase">
                  {t(s, "factGate")} · {t(s, "verifiedRewrite")}
                </span>
              </div>

              {s.countdown.enabled && (
                <div className="mt-7">
                  <p className="font-mono-x mb-2.5 text-[10px] tracking-[0.28em] text-[#6b6250] uppercase">
                    {t(s, "backOnline")} — {eta.toLocaleDateString(L === "bn" ? "bn-BD" : "en-US", { month: "long", day: "numeric" })}
                  </p>
                  <HoiCountdown s={s} />
                </div>
              )}

              {s.progress.enabled && (
                <div className="mt-6 max-w-md">
                  <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone="light" color="#d2202c" />
                </div>
              )}

              {s.newsletter.enabled && (
                <div className="mt-7 max-w-xl border-y border-[#1a140d]/15 py-5">
                  <p className="font-sans-bn mb-3 text-sm font-bold text-[#1a140d]">
                    {L === "bn" ? s.newsletter.titleBn : s.newsletter.title}
                  </p>
                  <HoiNewsletter s={s} />
                </div>
              )}

              {s.hoichoi.showStats && (
                <div className="mt-6 max-w-2xl">
                  <StatQuartet s={s} />
                </div>
              )}
            </div>

            <aside className="lg:col-span-4 lg:border-l lg:border-[#1a140d]/15 lg:pl-[2cqw] max-lg:border-t max-lg:border-[#1a140d]/15 max-lg:pt-6">
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="font-mono-x text-[9px] tracking-[0.3em] text-[#6b6250] uppercase">{t(s, "status")}</dt>
                  <dd className="font-sans-bn mt-1.5 flex items-center gap-2 font-bold text-[#1a140d]">
                    <span className="hoi-live-dot h-2 w-2 rounded-full bg-[#d2202c] text-[#d2202c]" />
                    {copy.badge}
                  </dd>
                </div>
                {s.countdown.enabled && (
                  <div>
                    <dt className="font-mono-x text-[9px] tracking-[0.3em] text-[#6b6250] uppercase">{t(s, "backOnline")}</dt>
                    <dd className="font-sans-bn mt-1.5 font-bold text-[#1a140d]">
                      {eta.toLocaleDateString(L === "bn" ? "bn-BD" : "en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </dd>
                    <div className="mt-2.5">
                      <HoiCountdown s={s} variant="inline" />
                    </div>
                  </div>
                )}
                {s.hoichoi.showPipeline && (
                  <div>
                    <dt className="font-mono-x text-[9px] tracking-[0.3em] text-[#6b6250] uppercase">
                      {L === "bn" ? "পাইপলাইন" : "Pipeline"}
                    </dt>
                    <dd className="mt-2.5">
                      <PipelineSteps s={s} compact />
                    </dd>
                  </div>
                )}
                {s.contact.enabled && (
                  <div>
                    <dt className="font-mono-x text-[9px] tracking-[0.3em] text-[#6b6250] uppercase">{t(s, "reachUs")}</dt>
                    <dd className="font-sans-bn mt-1.5 space-y-1 text-[#1a140d]">
                      <p className="font-bold">{s.contact.email}</p>
                      {s.contact.phone && <p className="text-[#6b6250]">{s.contact.phone}</p>}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-mono-x text-[9px] tracking-[0.3em] text-[#6b6250] uppercase">{t(s, "elsewhere")}</dt>
                  <dd className="mt-2.5">
                    <SocialRow s={s} tone="light" />
                  </dd>
                </div>
              </dl>
              {s.contact.formEnabled && s.contact.enabled && (
                <div className="mt-6">
                  <ContactForm s={s} tone="light" />
                </div>
              )}
            </aside>
          </div>
        </div>

        <PipelineStrip s={s} />
        <footer className="flex items-center justify-between px-[4cqw] py-[1.4cqw] text-[10px] tracking-[0.14em] text-[#6b6250] uppercase max-lg:px-5">
          <span className="font-sans-bn">{copy.footerNote}</span>
          <span className="font-mono-x max-lg:hidden">
            <Scramble text={L === "bn" ? "নং ০০১ — ধৈর্য ধরুন" : "NO. 001 — HOLD TIGHT"} />
          </span>
        </footer>
      </div>
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30 opacity-50" />}
    </div>
  );
}

/* ========================= 2. COLLECTOR TERMINAL (Tauri) ========================= */

export function TerminalTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const k = INTENSITY_SCALE[s.intensity];
  const boot = L === "bn"
    ? [
        "$ hoichoi collector --status",
        "› টারসো ডাটাবেসে সংযোগ ..................... পরীক্ষা চলছে",
        "› পাবলিক ডেটা API · GET /api/stats ......... ১০s পোল",
        "› ডেস্কটপ কালেক্টর heartbeat ............... পাওয়া যায়নি",
        `› সর্বশেষ রান ${s.hoichoi.lastRun} · ISR 300s · EDGE CACHE ON`,
      ]
    : [
        "$ hoichoi collector --status",
        "› connecting to turso database ............. checking",
        "› public data api · GET /api/stats ......... 10s poll",
        "› desktop collector heartbeat .............. none yet",
        `› last run ${s.hoichoi.lastRun} · ISR 300s · EDGE CACHE ON`,
      ];

  return (
    <div className="mc-stage mc-scanlines font-sans-bn" style={stageVars(s, { background: "#050608" })}>
      <div className="hoi-night-grid absolute inset-0" />
      <MatrixRain columns={Math.round(20 * k)} seed={13} color="#5f8f0e" />
      <div className="absolute inset-0 bg-[#050608]/78" />
      {s.effects.spotlight && <Spotlight color="#c8f65d" />}

      <div className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-[4cqw] py-8 max-lg:px-4">
        <div className="my-auto w-full max-w-4xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono-x inline-flex items-center gap-2 rounded-full border border-[#c8f65d]/30 bg-[#c8f65d]/10 px-3.5 py-1.5 text-[10px] tracking-[0.24em] text-[#c8f65d] uppercase">
              <span className="hoi-live-dot h-1.5 w-1.5 rounded-full bg-[#c8f65d] text-[#c8f65d]" />
              {copy.badge}
            </span>
            <span className="font-mono-x text-[10px] tracking-[0.24em] text-white/40 uppercase">
              {L === "bn" ? "হৈচৈ ডেস্ক · TAURI WEB VIEW" : "HOICHOI DESK · TAURI WEB VIEW"}
            </span>
          </div>

          <div className="hoi-tauri overflow-hidden rounded-xl border border-white/10 bg-[#0c1017]/95">
            {/* titlebar */}
            <div className="flex h-10 items-center gap-2 border-b border-white/8 bg-[#12161e] px-3">
              <span className="hoi-traffic bg-[#ff5f57]" />
              <span className="hoi-traffic bg-[#febc2e]" />
              <span className="hoi-traffic bg-[#28c840]" />
              <span className="font-serif-bn mx-auto text-[13px] font-bold text-white/90">
                {L === "bn" ? "হৈচৈ ডেস্ক" : "Hoichoi Desk"}
              </span>
              <span className="font-mono-x hidden rounded bg-white/8 px-2 py-0.5 text-[9px] text-white/50 sm:block">
                ISR 300s · EDGE CACHE ON
              </span>
            </div>

            {/* metric strip like the real desk */}
            <div className="grid grid-cols-2 gap-px border-b border-white/8 bg-white/8 sm:grid-cols-4">
              {[
                { v: s.hoichoi.stats.collected, l: t(s, "collected"), c: "#c8f65d" },
                { v: s.hoichoi.stats.published, l: t(s, "published"), c: "#90afff" },
                { v: s.hoichoi.stats.duplicates, l: t(s, "duplicates"), c: "#ffb454" },
                { v: s.hoichoi.stats.comments, l: t(s, "comments"), c: "#f38e98" },
              ].map((m) => (
                <div key={m.l} className="bg-[#0c1017] px-3 py-2.5 text-center">
                  <p className="font-serif-bn hoi-tnum text-xl leading-none font-extrabold" style={{ color: m.c }}>
                    {bnNum(m.v, L)}
                  </p>
                  <p className="mt-1 text-[10px] text-white/45">{m.l}</p>
                </div>
              ))}
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <Typewriter lines={boot} speed={14} className="font-mono-x block text-[11px] leading-relaxed text-[#c8f65d]/75 sm:text-xs" />

              <div>
                <p className="font-mono-x text-[10px] tracking-[0.3em] text-[#c8f65d]/60 uppercase">
                  <Scramble text={L === "bn" ? "// স্ট্যাটাস রিপোর্ট" : "// status report"} />
                </p>
                <h1
                  className="font-serif-bn mt-2 font-extrabold text-[#f3eee1]"
                  style={{ fontSize: "clamp(1.5rem, 4cqw, 2.9rem)", lineHeight: 1.15, textShadow: "0 0 30px rgba(200,246,93,0.25)" }}
                >
                  {copy.headline}
                  <span className="ml-2 inline-block h-[0.85em] w-[0.45ch] translate-y-[0.08em] animate-blink bg-[#c8f65d]" />
                </h1>
                <p className="font-sans-bn mt-1 text-[13px] font-semibold text-[#c8f65d]/80">{copy.subheadline}</p>
                <p className="mt-2.5 max-w-xl text-xs leading-relaxed text-white/50 sm:text-[13px]">{copy.body}</p>
              </div>

              <StatusGrid s={s} dark />

              {s.countdown.enabled && (
                <div>
                  <p className="font-mono-x mb-2.5 text-[10px] tracking-[0.3em] text-[#c8f65d]/60 uppercase">
                    {t(s, "timeRemaining")} — {t(s, "retrying")}
                  </p>
                  <HoiCountdown s={s} dark variant={s.countdown.style === "flip" ? "digits" : s.countdown.style} />
                </div>
              )}

              {s.progress.enabled && (
                <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone="dark" color="#c8f65d" />
              )}

              {s.newsletter.enabled && (
                <div>
                  <p className="font-mono-x mb-2.5 text-[10px] tracking-[0.3em] text-[#c8f65d]/60 uppercase">
                    $ subscribe --notify
                  </p>
                  <HoiNewsletter s={s} dark />
                </div>
              )}

              {s.contact.formEnabled && s.contact.enabled && <ContactForm s={s} tone="dark" />}

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                <SocialRow s={s} tone="dark" />
                <ContactRow s={s} tone="dark" />
              </div>
            </div>
          </div>

          <PipelineStrip s={s} dark />
          <p className="font-sans-bn mt-2 text-center text-[10.5px] text-white/35">{copy.footerNote}</p>
        </div>
      </div>
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30 opacity-60" />}
    </div>
  );
}

/* ============================ 3. BREAKING BAND (on-air) ============================ */

export function NeonTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const k = INTENSITY_SCALE[s.intensity];
  return (
    <div className="mc-stage mc-scanlines font-sans-bn" style={stageVars(s, { background: "#050608" })}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #160a0c 0%, #2a0d12 34%, #12060a 52%, #050608 53%, #030405 100%)" }} />
      <Starfield count={Math.round(70 * k)} seed={17} color="#ffe6e6" />
      {/* ON-AIR disc */}
      <div
        className="absolute top-[13%] left-1/2 h-[24cqw] w-[24cqw] max-h-64 max-w-64 min-h-32 min-w-32 -translate-x-1/2 rounded-full animate-float-slow"
        style={{
          background: "linear-gradient(180deg, #ffd9a8, #d2202c 48%, #5c0a12 100%)",
          boxShadow: "0 0 120px 30px rgba(210,32,44,0.5), 0 0 240px 60px rgba(200,246,93,0.18)",
          maskImage: "repeating-linear-gradient(to bottom, #000 0 10px, transparent 10px 14px)",
          WebkitMaskImage: "repeating-linear-gradient(to bottom, #000 0 10px, transparent 10px 14px)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[44%] overflow-hidden">
        <div className="mc-perspective-grid absolute inset-x-[-40%] top-0 h-[220%]" style={{ ["--mc-line" as string]: "rgba(200,246,93,0.5)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #12060a, transparent 42%)" }} />
      </div>
      {s.effects.spotlight && <Spotlight color="#d2202c" />}

      <div className="absolute inset-x-0 top-0 z-20">
        <BreakingBand s={s} dark />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-6 pt-16 pb-20 text-center">
        <div className="my-auto flex w-full max-w-4xl flex-col items-center">
          <span className="font-mono-x inline-flex items-center gap-2 rounded-full border border-[#c8f65d]/40 bg-black/50 px-4 py-1.5 text-[10px] tracking-[0.3em] text-[#c8f65d] uppercase">
            <span className="hoi-live-dot h-1.5 w-1.5 rounded-full bg-[#ff6b6b] text-[#ff6b6b]" />
            {L === "bn" ? "সরাসরি ডেস্ক" : "live desk"} · ISR
          </span>
          <h1
            className="font-serif-bn mt-5 font-black tracking-tight text-[#f3eee1] uppercase"
            style={{ fontSize: "clamp(2rem, 7.4cqw, 6.4rem)", lineHeight: 1, textShadow: "0 0 34px rgba(210,32,44,0.65), 0 4px 0 #a3121d" }}
          >
            {copy.headline}
          </h1>
          <p
            className="font-sans-bn mt-4 animate-flicker text-[1.6cqw] max-lg:text-sm font-bold tracking-[0.18em] uppercase"
            style={{ color: "#c8f65d", textShadow: "0 0 18px rgba(200,246,93,0.8)" }}
          >
            {copy.subheadline}
          </p>
          <p className="mt-4 max-w-xl text-[1.3cqw] max-lg:text-xs leading-relaxed text-white/55">{copy.body}</p>

          {s.countdown.enabled && (
            <div className="mt-7 rounded-2xl border border-white/12 bg-black/55 px-5 py-4 backdrop-blur">
              <p className="font-mono-x mb-3 text-[9px] tracking-[0.3em] text-white/45 uppercase">{t(s, "backOnline")} · lower third</p>
              <HoiCountdown s={s} dark variant={s.countdown.style === "flip" ? "digits" : s.countdown.style} />
            </div>
          )}

          {s.hoichoi.showStats && (
            <div className="mt-6 w-full max-w-2xl">
              <StatQuartet s={s} dark />
            </div>
          )}

          {s.newsletter.enabled && (
            <div className="mt-7 flex w-full flex-col items-center gap-3">
              <p className="font-sans-bn text-[1.3cqw] max-lg:text-xs font-bold tracking-[0.14em] text-white/70 uppercase">
                {L === "bn" ? s.newsletter.titleBn : s.newsletter.title}
              </p>
              <HoiNewsletter s={s} dark />
            </div>
          )}

          {s.progress.enabled && (
            <div className="mt-7 flex w-full justify-center">
              <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone="dark" color="#c8f65d" />
            </div>
          )}

          <div className="mt-7 flex flex-col items-center gap-4">
            <SocialRow s={s} tone="dark" />
            <ContactRow s={s} tone="dark" />
          </div>
        </div>
      </div>

      {s.hoichoi.showTicker && (
        <div className="absolute inset-x-0 bottom-0 z-20">
          <HoiTicker s={s} dark />
          <PipelineStrip s={s} dark />
        </div>
      )}
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30" />}
    </div>
  );
}

/* ========================== 4. PRESS BLUEPRINT (schematic) ========================== */

function PressRoller({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 240 260" className="h-full w-full" fill="none" stroke={color} strokeWidth="1.6">
      <circle cx="120" cy="110" r="52" />
      <circle cx="120" cy="110" r="38" className="mc-dash" />
      <circle cx="120" cy="110" r="10" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <line key={a} x1="120" y1="110" x2={120 + 52 * Math.cos((a * Math.PI) / 180)} y2={110 + 52 * Math.sin((a * Math.PI) / 180)} />
      ))}
      <path d="M40 200h160" strokeWidth="2.4" />
      <path d="M40 200l14-16M200 200l-14-16" />
      <path d="M68 200v-24h104v24" className="mc-dash" />
      <path d="M120 162v22" className="mc-hook" />
      <rect x="108" y="184" width="24" height="10" />
    </svg>
  );
}

export function BlueprintTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const k = INTENSITY_SCALE[s.intensity];
  return (
    <div className="mc-stage font-mono-x" style={stageVars(s, { background: "#10141b", ["--mc-grid" as string]: "#7dd3fc" })}>
      <div className="mc-grid-paper absolute inset-0 opacity-50" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(70% 60% at 30% 20%, rgba(125,211,252,0.12), transparent 70%)" }} />
      <svg className="absolute inset-0 h-full w-full opacity-60" fill="none" stroke="#7cc3ff" strokeWidth="1">
        <path d="M0 78H100%" className="mc-dash" />
        <circle cx="12%" cy="18%" r="26" className="mc-dash" />
      </svg>
      {s.effects.particles && <Dust count={Math.round(14 * k)} seed={77} color="#8ec9ff" />}

      <div className="pointer-events-none absolute top-[8%] right-[4%] h-[40%] w-[20%] max-lg:hidden">
        <PressRoller color="#a9d6ff" />
      </div>

      <div className="absolute top-[3cqw] left-[3cqw] text-[1.1cqw] max-lg:text-[10px] text-sky-200/70">
        <p>SHEET 06 / 06 · REV 2.4</p>
        <p>{PIPELINE_STRIP}</p>
      </div>
      <div className="absolute top-[3cqw] right-[3cqw]">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-400/10 px-4 py-1.5 text-[10px] tracking-[0.24em] text-sky-100/90 uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8f65d]" />
          {copy.badge}
        </span>
      </div>

      <div className="relative z-10 flex h-full flex-col items-start overflow-y-auto px-[6cqw] py-[6cqw] max-lg:px-5 max-lg:py-20">
        <div className="my-auto w-full max-w-5xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="font-serif-bn grid h-11 w-11 place-items-center border border-sky-300/50 bg-[#d2202c] text-lg font-black text-white">
              {s.brand.mark}
            </span>
            <div>
              <p className="font-sans-bn text-sm font-bold tracking-[0.18em] text-sky-50 uppercase">
                {L === "bn" ? s.brand.nameBn : s.brand.name} · {L === "bn" ? "সিস্টেম ব্লুপ্রিন্ট" : "system blueprint"}
              </p>
              <p className="text-[10px] tracking-[0.3em] text-sky-200/60 uppercase">{t(s, "every2h")}</p>
            </div>
          </div>

          <p className="mb-3 text-[1.2cqw] max-lg:text-[11px] tracking-[0.3em] text-[#c8f65d] uppercase">
            {`// ${copy.subheadline}`}
          </p>
          <h1
            className="mc-stroke-text font-sans-bn font-bold uppercase"
            style={{ fontSize: "clamp(1.8rem, 5.4cqw, 4.6rem)", lineHeight: 1.02, ["--mc-text" as string]: "#dbeafe" }}
          >
            {copy.headline}
          </h1>
          <div className="mc-line mt-5 h-px w-64 bg-sky-300/60" />
          <p className="font-sans-bn mt-5 max-w-xl text-[1.3cqw] max-lg:text-xs leading-relaxed text-sky-100/70">
            {copy.body}
          </p>

          {s.hoichoi.showPipeline && (
            <div className="mt-7 max-w-4xl">
              <PipelineSteps s={s} dark />
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-end gap-[3cqw] max-lg:gap-6">
            {s.countdown.enabled && (
              <div>
                <p className="mb-2 text-[1rem] max-lg:text-[10px] tracking-[0.3em] text-sky-200/60 uppercase">
                  {t(s, "estimatedHandover")}
                </p>
                <HoiCountdown s={s} dark variant="inline" />
              </div>
            )}
            {s.progress.enabled && (
              <div className="w-full max-w-xs">
                <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone="blueprint" color="#7cc0ff" />
              </div>
            )}
          </div>

          {s.hoichoi.showStats && (
            <div className="mt-6 max-w-3xl">
              <StatusGrid s={s} dark />
            </div>
          )}

          {s.newsletter.enabled && (
            <div className="mt-6 max-w-lg border border-sky-300/30 bg-[#0a0d12]/70 p-4">
              <p className="font-sans-bn mb-3 text-[1rem] max-lg:text-[10px] font-bold tracking-[0.2em] text-sky-200/80 uppercase">
                {L === "bn" ? s.newsletter.titleBn : s.newsletter.title}
              </p>
              <HoiNewsletter s={s} dark />
            </div>
          )}

          {s.contact.formEnabled && s.contact.enabled && (
            <div className="mt-5 max-w-lg">
              <ContactForm s={s} tone="blueprint" />
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-6">
            <SocialRow s={s} tone="blueprint" />
            <ContactRow s={s} tone="blueprint" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-sky-300/25 bg-[#0a0d12]/70">
        <PipelineStrip s={s} dark />
      </div>
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30" />}
    </div>
  );
}

/* Re-export kept-alive pieces so tree-shaking never drops fx in previews */
export function __keepOne() {
  return { Meteors, Tilt, useParallax, Countdown, Reveal };
}

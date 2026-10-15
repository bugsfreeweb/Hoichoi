"use client";

import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/types";
import { HOICHOI_PIPELINE, INTENSITY_SCALE, bnNum, copyFor, loc, t } from "@/lib/types";
import { ContactForm, ContactRow, Progress, SocialRow, stageVars, useCountdown, type Tone } from "@/components/blocks";
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
import { AuroraBlobs, Dust, Meteors, Reveal, Spotlight, Starfield, Tilt, useParallax } from "@/components/fx";

const pad = (n: number) => String(n).padStart(2, "0");

/* ==================== 5. HASH-STAMP FLIP (split-flap press) ==================== */

function HoiFlipUnit({ value, label, dark }: { value: string; label: string; dark?: boolean }) {
  const [prev, setPrev] = useState(value);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (prev === value) return;
    setFlip(true);
    const id = setTimeout(() => {
      setPrev(value);
      setFlip(false);
    }, 430);
    return () => clearTimeout(id);
  }, [value, prev]);

  const half = "absolute inset-x-0 h-1/2 overflow-hidden";
  const inner = "absolute inset-x-0 h-[200%] grid place-items-center";
  const digit = "font-serif-bn hoi-tnum font-extrabold text-[5.2cqw] max-lg:text-4xl";
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`mc-flip-card relative h-[8.2cqw] max-h-28 min-h-16 w-[6.4cqw] max-w-24 min-w-12 rounded-lg border shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] ${
          dark ? "border-white/10 bg-gradient-to-b from-[#232a36] to-[#0c1017]" : "border-[#1a140d]/20 bg-gradient-to-b from-white to-[#e9e2cf]"
        }`}
      >
        <div className={`${half} top-0`}>
          <div className={`${inner} top-0`}>
            <span className={`${digit} ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>{value}</span>
          </div>
        </div>
        <div className={`${half} bottom-0`}>
          <div className={`${inner} bottom-0`}>
            <span className={`${digit} ${dark ? "text-[#f3eee1]/90" : "text-[#1a140d]/90"}`}>{prev}</span>
          </div>
        </div>
        {flip && (
          <div className={`${half} top-0 z-10 mc-flip-top ${dark ? "bg-[#232a36]" : "bg-white"}`}>
            <div className={`${inner} top-0`}>
              <span className={`${digit} ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>{prev}</span>
            </div>
          </div>
        )}
        {flip && (
          <div className={`${half} bottom-0 z-10 mc-flip-bottom ${dark ? "bg-[#0c1017]" : "bg-[#e9e2cf]"}`}>
            <div className={`${inner} bottom-0`}>
              <span className={`${digit} ${dark ? "text-[#f3eee1]/90" : "text-[#1a140d]/90"}`}>{value}</span>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 top-1/2 h-px bg-[#d2202c]/60" />
      </div>
      <span className={`font-mono-x text-[1.4cqw] max-lg:text-[10px] uppercase tracking-[0.28em] ${dark ? "text-white/50" : "text-[#6b6250]"}`}>
        {label}
      </span>
    </div>
  );
}

export function HoiFlipClock({ s, dark = false }: { s: SiteSettings; dark?: boolean }) {
  const L = loc(s);
  const { days, hours, minutes, seconds, mounted } = useCountdown(s.countdown.target);
  const num = (n: number) => (mounted ? bnNum(pad(n), L) : "––");
  const units = [
    { label: t(s, "days"), value: num(days) },
    { label: t(s, "hours"), value: num(hours) },
    { label: t(s, "minutes"), value: num(minutes) },
    { label: t(s, "seconds"), value: num(seconds) },
  ];
  return (
    <div className="flex items-start gap-[2cqw] max-lg:gap-3">
      {units.map((u) => (
        <HoiFlipUnit key={u.label} value={u.value} label={u.label} dark={dark} />
      ))}
    </div>
  );
}

export function FlipTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const k = INTENSITY_SCALE[s.intensity];
  return (
    <div className="mc-stage font-sans-bn" style={stageVars(s, { background: "#1a140d" })}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 42% at 50% -6%, rgba(210,32,44,0.4), transparent 72%), radial-gradient(80% 60% at 50% 120%, rgba(95,143,14,0.28), transparent 70%), linear-gradient(180deg,#241a10,#0e0b07)",
        }}
      />
      {s.effects.particles && <Dust count={Math.round(20 * k)} seed={61} color="#ffb454" />}
      {s.effects.spotlight && <Spotlight color="#d2202c" />}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40 animate-sweep"
        style={{ background: "linear-gradient(100deg, transparent 35%, rgba(255,236,190,0.4) 50%, transparent 65%)" }}
      />

      <div className="absolute inset-x-0 top-0 z-20">
        <BreakingBand s={s} dark />
        <header className="flex items-center justify-between px-[4cqw] py-[1.8cqw] max-lg:px-5">
          <HoiLogo s={s} dark />
          <HashStamp s={s} dark />
        </header>
      </div>

      <div className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-[5cqw] pt-32 pb-16 text-center max-lg:px-5">
        <div className="my-auto flex w-full max-w-4xl flex-col items-center">
          <Eyebrow dark>{copy.subheadline}</Eyebrow>
          <h1
            className="font-serif-bn mt-4 max-w-4xl font-extrabold tracking-tight text-[#f3eee1]"
            style={{ fontSize: "clamp(1.7rem, 4.4cqw, 3.4rem)", lineHeight: 1.12 }}
          >
            {copy.headline}
          </h1>

          {s.countdown.enabled && (
            <div className="mt-8">
              {s.countdown.style === "flip" ? <HoiFlipClock s={s} dark /> : <HoiCountdown s={s} dark />}
            </div>
          )}

          <p className="mt-7 max-w-xl text-[1.35cqw] max-lg:text-xs leading-relaxed text-white/55">{copy.body}</p>

          {s.hoichoi.showStats && (
            <div className="mt-6 w-full max-w-2xl">
              <StatQuartet s={s} dark />
            </div>
          )}

          {s.progress.enabled && (
            <div className="mt-7 flex w-full justify-center">
              <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone="dark" color="#ffb454" />
            </div>
          )}

          {s.newsletter.enabled && (
            <div className="mt-7 flex w-full flex-col items-center gap-3">
              <p className="font-sans-bn text-[1.3cqw] max-lg:text-xs font-bold text-white/70">
                {L === "bn" ? s.newsletter.titleBn : s.newsletter.title}
              </p>
              <HoiNewsletter s={s} dark />
            </div>
          )}

          <div className="mt-7 flex flex-col items-center gap-4">
            <SocialRow s={s} tone="dark" />
            <ContactRow s={s} tone="dark" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20">
        {s.hoichoi.showTicker && <HoiTicker s={s} dark />}
        <p className="bg-black/50 px-4 py-2 text-center text-[10px] text-white/40">{copy.footerNote}</p>
      </div>
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30 opacity-70" />}
    </div>
  );
}

/* ============================ 6. PAPER MORNING (daylight) ============================ */

export function AuroraTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const p = useParallax();
  const k = INTENSITY_SCALE[s.intensity];
  const tone: Tone = "light";

  const card = (
    <div
      className={`relative my-auto w-full max-w-3xl rounded-[24px] border border-[#1a140d]/12 bg-white/75 p-[3.6cqw] backdrop-blur-xl max-lg:p-6`}
      style={{ boxShadow: "0 50px 120px -50px rgba(26,20,13,0.45)" }}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <HoiLogo s={s} />
          <span className="inline-flex items-center gap-2 rounded-full bg-[#d2202c] px-3.5 py-1.5 text-[10px] font-bold tracking-[0.22em] text-white uppercase">
            <span className="hoi-live-dot h-1.5 w-1.5 rounded-full bg-white text-white" />
            {copy.badge}
          </span>
        </div>

        <div>
          <Eyebrow>{L === "bn" ? "দিনের সংস্করণ · শান্ত প্রেস" : "Day edition · quiet press"}</Eyebrow>
          <h1
            className="font-serif-bn mt-2 font-extrabold tracking-tight text-[#1a140d]"
            style={{ fontSize: "clamp(1.8rem, 4.4cqw, 3.4rem)", lineHeight: 1.08 }}
          >
            {copy.headline}
          </h1>
          <div className="mt-4 h-1 w-28 rounded-full" style={{ background: "linear-gradient(90deg, #d2202c, #c8f65d)" }} />
          <p className="font-sans-bn mt-4 text-[1.5cqw] max-lg:text-base font-semibold text-[#d2202c]">{copy.subheadline}</p>
          <p className="mt-2.5 max-w-xl text-[1.3cqw] max-lg:text-sm leading-relaxed text-[#6b6250]">{copy.body}</p>
        </div>

        {s.countdown.enabled && <HoiCountdown s={s} />}

        {s.hoichoi.showStats && <StatQuartet s={s} />}

        {s.progress.enabled && (
          <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone={tone} color="#d2202c" />
        )}

        {s.newsletter.enabled && (
          <div className="rounded-2xl border border-[#1a140d]/10 bg-[#f3eee1]/70 p-4">
            <p className="font-sans-bn mb-3 text-sm font-bold text-[#1a140d]">
              {L === "bn" ? s.newsletter.titleBn : s.newsletter.title}
            </p>
            <HoiNewsletter s={s} />
          </div>
        )}

        {s.contact.formEnabled && s.contact.enabled && <ContactForm s={s} tone={tone} />}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1a140d]/10 pt-4">
          <SocialRow s={s} tone={tone} />
          <ContactRow s={s} tone={tone} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mc-stage font-sans-bn" style={stageVars(s, { background: "#f3eee1" })}>
      <div className="hoi-paper absolute inset-0" />
      <AuroraBlobs colors={["#d2202c", "#c8f65d", "#ffb454"]} opacity={0.22 * k} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: `translate3d(${p.x * -12}px, ${p.y * -10}px, 0)`, transition: "transform 400ms cubic-bezier(0.2,0.8,0.2,1)" }}
      >
        <Starfield count={Math.round(22 * k)} seed={53} color="#8b93ff" />
      </div>
      {s.effects.spotlight && <Spotlight color="#d2202c" />}

      <div className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-[5cqw] py-14 max-lg:px-4">
        {s.effects.tilt ? (
          <Tilt max={3} className="my-auto w-full max-w-3xl">
            {card}
          </Tilt>
        ) : (
          card
        )}
        <p className="mt-4 text-center text-[11px] text-[#6b6250]">{copy.footerNote}</p>
      </div>
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30 opacity-40" />}
    </div>
  );
}

/* ============================ 7. NIGHT DESK (late edition) ============================ */

export function NebulaTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const k = INTENSITY_SCALE[s.intensity];

  return (
    <div className="mc-stage font-sans-bn text-white" style={stageVars(s, { background: "#050608" })}>
      <div
        className="absolute inset-0 animate-gradient"
        style={{
          background:
            "radial-gradient(60% 55% at 18% 22%, rgba(210,32,44,0.35), transparent 65%), radial-gradient(50% 50% at 82% 18%, rgba(200,246,93,0.16), transparent 62%), radial-gradient(70% 60% at 60% 92%, rgba(210,32,44,0.22), transparent 68%)",
          backgroundSize: "180% 180%",
        }}
      />
      <Starfield count={Math.round(110 * k)} seed={9} color="#ffe9c9" />
      {s.effects.particles && <Dust count={Math.round(28 * k)} seed={31} color="#c8f65d" />}
      {s.effects.meteors && <Meteors count={Math.round(5 * k)} seed={4} />}
      {s.effects.spotlight && <Spotlight color="#c8f65d" />}
      <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 45%, transparent, rgba(0,0,0,0.72))" }} />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[4cqw] py-[2.2cqw] max-lg:px-5 max-lg:py-4">
        <HoiLogo s={s} dark />
        <span className="font-mono-x inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-[10px] tracking-[0.26em] text-white/75 uppercase backdrop-blur">
          <span className="hoi-live-dot h-1.5 w-1.5 rounded-full bg-[#d2202c] text-[#d2202c]" />
          {copy.badge}
        </span>
      </header>

      <div className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-[5cqw] py-[8cqw] max-lg:px-5 max-lg:py-24">
        <div className="my-auto flex w-full max-w-4xl flex-col items-center text-center">
          <Reveal delay={60}>
            <p className="font-mono-x mb-5 text-[1.3cqw] max-lg:text-[11px] tracking-[0.4em] text-[#c8f65d]/70 uppercase">
              {L === "bn" ? "শেষ সংস্করণ · নাইট ডেস্ক" : "Late edition · night desk"}
            </p>
          </Reveal>
          <Reveal delay={140}>
            <h1
              className="font-serif-bn font-extrabold tracking-tight"
              style={{ fontSize: "clamp(2rem, 5.6cqw, 4.8rem)", lineHeight: 1.06, textShadow: "0 0 60px rgba(210,32,44,0.4)" }}
            >
              {copy.headline}
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="font-sans-bn mt-5 text-[1.7cqw] max-lg:text-base font-semibold text-[#c8f65d]">{copy.subheadline}</p>
          </Reveal>
          <Reveal delay={320}>
            <p className="mt-4 max-w-2xl text-[1.35cqw] max-lg:text-sm leading-relaxed text-white/50">{copy.body}</p>
          </Reveal>

          {s.countdown.enabled && (
            <Reveal delay={400} className="mt-8">
              <HoiCountdown s={s} dark variant={s.countdown.style === "flip" ? "digits" : s.countdown.style} />
            </Reveal>
          )}

          {s.hoichoi.showStats && (
            <Reveal delay={460} className="mt-7 w-full max-w-2xl">
              <StatQuartet s={s} dark />
            </Reveal>
          )}

          {s.newsletter.enabled && (
            <Reveal delay={520} className="mt-8 w-full">
              <div className="flex flex-col items-center gap-3">
                <p className="font-sans-bn text-[1.4cqw] max-lg:text-sm font-bold text-white/70">
                  {L === "bn" ? s.newsletter.titleBn : s.newsletter.title}
                </p>
                <HoiNewsletter s={s} dark />
              </div>
            </Reveal>
          )}

          {s.progress.enabled && (
            <Reveal delay={580} className="mt-8 w-full">
              <div className="flex justify-center">
                <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone="dark" color="#c8f65d" />
              </div>
            </Reveal>
          )}

          <Reveal delay={640} className="mt-8">
            <div className="flex flex-col items-center gap-4">
              <SocialRow s={s} tone="dark" />
              <ContactRow s={s} tone="dark" />
            </div>
          </Reveal>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20">
        {s.hoichoi.showTicker && <HoiTicker s={s} dark />}
        <footer className="flex items-center justify-between bg-black/55 px-[4cqw] py-[1.6cqw] text-[1.1cqw] max-lg:px-5 max-lg:py-3 max-lg:text-[10px] text-white/40">
          <span className="font-sans-bn">{copy.footerNote}</span>
          <span className="font-mono-x max-lg:hidden">FEED → SHOT → HASH → LLM → GIT → DEPLOY</span>
        </footer>
      </div>
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30" />}
    </div>
  );
}

/* ============================ 8. SYNC ORBIT (pipeline) ============================ */

export function OrbitTheme({ s }: { s: SiteSettings }) {
  const L = loc(s);
  const copy = copyFor(s);
  const p = useParallax();
  const k = INTENSITY_SCALE[s.intensity];
  const layer = (depth: number) => ({
    transform: `translate3d(${p.x * depth}px, ${p.y * depth}px, 0)`,
    transition: "transform 500ms cubic-bezier(0.2,0.8,0.2,1)",
  });

  return (
    <div className="mc-stage font-sans-bn text-white" style={stageVars(s, { background: "#050608" })}>
      <div className="hoi-night-grid absolute inset-0" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(50% 45% at 22% 18%, rgba(210,32,44,0.3), transparent 66%), radial-gradient(46% 44% at 82% 26%, rgba(200,246,93,0.14), transparent 64%)" }}
      />
      <div className="absolute inset-0" style={layer(-18)}>
        <Starfield count={Math.round(80 * k)} seed={29} color="#ffd9a8" />
      </div>
      {s.effects.meteors && <Meteors count={Math.round(4 * k)} seed={8} />}
      {s.effects.particles && (
        <div className="absolute inset-0" style={layer(22)}>
          <Dust count={Math.round(18 * k)} seed={88} color="#c8f65d" />
        </div>
      )}

      {/* orbiting pipeline stages */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={layer(10)}>
        {[36, 50, 64].map((size, i) => (
          <span
            key={size}
            className="absolute rounded-full border animate-spin-slower"
            style={{
              width: `${size}cqw`, height: `${size}cqw`, left: `-${size / 2}cqw`, top: `-${size / 2}cqw`,
              borderColor: i % 2 ? "rgba(200,246,93,0.22)" : "rgba(210,32,44,0.35)",
              animationDuration: `${38 + i * 22}s`,
              animationDirection: i % 2 ? "reverse" : "normal",
            }}
          />
        ))}
        {HOICHOI_PIPELINE.map((stage, i) => (
          <span
            key={stage.en}
            className="absolute animate-orbit"
            style={{
              ["--r" as string]: `${18 + (i % 3) * 7}cqw`,
              animationDuration: `${16 + i * 4}s`,
              animationDelay: `${-i * 3.5}s`,
              animationDirection: i % 2 ? "reverse" : "normal",
            }}
          >
            <span
              className={`font-mono-x block rounded-full border px-3 py-1.5 text-[9px] tracking-[0.18em] whitespace-nowrap uppercase backdrop-blur ${
                i % 2 ? "border-[#c8f65d]/40 bg-[#c8f65d]/10 text-[#c8f65d]" : "border-[#d2202c]/50 bg-[#d2202c]/15 text-[#ffb4b4]"
              }`}
            >
              0{i + 1} · {L === "bn" ? stage.bn : stage.en}
            </span>
          </span>
        ))}
      </div>

      {s.effects.spotlight && <Spotlight color="#c8f65d" />}

      <div className="absolute inset-x-0 top-0 z-20">
        <BreakingBand s={s} dark />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-[5cqw] pt-20 pb-14 max-lg:px-4" style={layer(6)}>
        <Tilt max={7} className="my-auto w-full max-w-2xl rounded-[28px]">
          <div className="relative rounded-[28px] border border-white/12 bg-[#0c1017]/72 p-[3.6cqw] text-center backdrop-blur-xl max-lg:p-6" style={{ boxShadow: "0 50px 120px -50px rgba(0,0,0,0.9)" }}>
            <div className="mb-4 flex justify-center">
              <HoiLogo s={s} dark size="sm" />
            </div>
            <Eyebrow dark>{L === "bn" ? "সিঙ্ক অরবিট · ছয় ধাপ" : "Sync orbit · six stages"}</Eyebrow>
            <h1
              className="font-serif-bn mt-3 font-extrabold tracking-tight"
              style={{ fontSize: "clamp(1.7rem, 4.6cqw, 3.4rem)", lineHeight: 1.08 }}
            >
              {copy.headline}
            </h1>
            <p className="font-sans-bn mx-auto mt-3 max-w-md text-[1.4cqw] max-lg:text-sm font-semibold text-[#c8f65d]">
              {copy.subheadline}
            </p>
            <p className="mx-auto mt-2.5 max-w-md text-[1.2cqw] max-lg:text-xs leading-relaxed text-white/45">{copy.body}</p>

            {s.countdown.enabled && (
              <div className="mt-6 flex justify-center">
                <HoiCountdown s={s} dark variant={s.countdown.style === "flip" ? "digits" : s.countdown.style} />
              </div>
            )}

            {s.hoichoi.showPipeline && (
              <div className="mt-6 text-left">
                <PipelineSteps s={s} dark compact />
              </div>
            )}

            {s.newsletter.enabled && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="font-sans-bn text-[1.2cqw] max-lg:text-xs font-bold text-white/60">
                  {L === "bn" ? s.newsletter.titleBn : s.newsletter.title}
                </p>
                <HoiNewsletter s={s} dark />
              </div>
            )}

            {s.progress.enabled && (
              <div className="mt-6 flex justify-center">
                <Progress value={s.progress.value} label={L === "bn" ? s.progress.labelBn : s.progress.label} tone="dark" color="#c8f65d" />
              </div>
            )}

            <div className="mt-6">
              <StatusGrid s={s} dark />
            </div>

            <div className="mt-6 flex flex-col items-center gap-3.5 border-t border-white/10 pt-5">
              <SocialRow s={s} tone="dark" />
              <ContactRow s={s} tone="dark" />
            </div>
          </div>
        </Tilt>
        <p className="font-sans-bn mt-4 text-center text-[10.5px] text-white/35">{copy.footerNote}</p>
      </div>
      {s.effects.grain && <div className="mc-grain pointer-events-none absolute inset-0 z-30" />}
    </div>
  );
}

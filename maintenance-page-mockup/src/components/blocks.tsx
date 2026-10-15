"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Loader2, Mail, Phone, Send, MapPin } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { INTENSITY_SCALE, loc, t as tr } from "@/lib/types";

export type Tone = "dark" | "light" | "neon" | "paper" | "terminal" | "amber" | "blueprint";

export const TONE: Record<
  Tone,
  { panel: string; input: string; btn: string; text: string; muted: string; line: string; chip: string }
> = {
  dark: {
    panel: "bg-white/[0.06] border-white/12 backdrop-blur-xl",
    input: "bg-white/[0.07] border-white/15 text-white placeholder:text-white/40",
    btn: "bg-white text-slate-950 hover:bg-white/85",
    text: "text-white",
    muted: "text-white/55",
    line: "bg-white/12",
    chip: "bg-white/8 border-white/15 text-white/75",
  },
  light: {
    panel: "bg-white/70 border-slate-900/8 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(15,23,42,0.5)]",
    input: "bg-white border-slate-900/12 text-slate-900 placeholder:text-slate-400",
    btn: "bg-slate-900 text-white hover:bg-slate-800",
    text: "text-slate-900",
    muted: "text-slate-500",
    line: "bg-slate-900/10",
    chip: "bg-slate-900/5 border-slate-900/10 text-slate-600",
  },
  neon: {
    panel: "bg-[#1a0533]/70 border-fuchsia-400/30 backdrop-blur-md",
    input: "bg-black/40 border-fuchsia-400/40 text-cyan-100 placeholder:text-fuchsia-200/40",
    btn: "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-[#1a0533] hover:brightness-110",
    text: "text-white",
    muted: "text-fuchsia-100/60",
    line: "bg-fuchsia-400/25",
    chip: "bg-fuchsia-500/12 border-fuchsia-400/35 text-fuchsia-100/85",
  },
  paper: {
    panel: "bg-transparent border-slate-900/15",
    input: "bg-transparent border-slate-900/25 text-slate-900 placeholder:text-slate-400",
    btn: "bg-slate-950 text-paper hover:bg-slate-800",
    text: "text-slate-950",
    muted: "text-slate-500",
    line: "bg-slate-950/15",
    chip: "bg-slate-950/5 border-slate-950/15 text-slate-700",
  },
  terminal: {
    panel: "bg-emerald-950/40 border-emerald-400/25",
    input: "bg-black/60 border-emerald-400/35 text-emerald-200 placeholder:text-emerald-400/40 font-mono",
    btn: "bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-mono",
    text: "text-emerald-200",
    muted: "text-emerald-400/70",
    line: "bg-emerald-400/20",
    chip: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300",
  },
  amber: {
    panel: "bg-[#1c1710]/80 border-amber-300/20 backdrop-blur-sm",
    input: "bg-black/40 border-amber-200/25 text-amber-50 placeholder:text-amber-100/35",
    btn: "bg-amber-400 text-[#241a08] hover:bg-amber-300",
    text: "text-amber-50",
    muted: "text-amber-100/55",
    line: "bg-amber-200/15",
    chip: "bg-amber-400/10 border-amber-300/25 text-amber-100/85",
  },
  blueprint: {
    panel: "bg-[#0a2447]/60 border-sky-300/25 backdrop-blur-[2px]",
    input: "bg-[#061a33]/70 border-sky-300/30 text-sky-50 placeholder:text-sky-200/40",
    btn: "bg-sky-300 text-[#06203f] hover:bg-sky-200",
    text: "text-sky-50",
    muted: "text-sky-200/60",
    line: "bg-sky-300/20",
    chip: "bg-sky-400/10 border-sky-300/30 text-sky-100/85",
  },
};

export function stageVars(s: SiteSettings, extra?: CSSProperties): CSSProperties {
  return {
    ["--mc-primary" as string]: s.colors.primary,
    ["--mc-accent" as string]: s.colors.accent,
    ["--mc-bg" as string]: s.colors.bg,
    ["--mc-surface" as string]: s.colors.surface,
    ["--mc-text" as string]: s.colors.text,
    ["--mc-speed" as string]: `${1 / INTENSITY_SCALE[s.intensity]}`,
    ...extra,
  } as CSSProperties;
}

/* ---------------------------------- countdown --------------------------------- */

export function useCountdown(target: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = useMemo(() => new Date(target).getTime(), [target]);
  const diff = Math.max(0, (now ?? end) - end);
  return {
    mounted: now !== null,
    done: diff <= 0 && now !== null,
    days: Math.floor(diff / 86400000),
    hours: Math.floor(diff / 3600000) % 24,
    minutes: Math.floor(diff / 60000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function FlipUnit({ value, label, tone }: { value: string; label: string; tone: Tone }) {
  const [prev, setPrev] = useState(value);
  const [flip, setFlip] = useState(false);
  const t = TONE[tone];
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
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="mc-flip-card relative h-[8.2cqw] max-h-28 min-h-16 w-[6.4cqw] max-w-24 min-w-12 rounded-lg border border-white/10 bg-gradient-to-b from-[#2a2118] to-[#150f09] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]">
        <div className={`${half} top-0`}>
          <div className={`${inner} top-0`}>
            <span className="font-semibold tabular-nums text-[5.4cqw] max-lg:text-4xl text-amber-100">{value}</span>
          </div>
        </div>
        <div className={`${half} bottom-0`}>
          <div className={`${inner} bottom-0`}>
            <span className="font-semibold tabular-nums text-[5.4cqw] max-lg:text-4xl text-amber-100/90">{prev}</span>
          </div>
        </div>
        {flip && (
          <div className={`${half} top-0 z-10 mc-flip-top bg-gradient-to-b from-[#2a2118] to-[#1d160e]`}>
            <div className={`${inner} top-0`}>
              <span className="font-semibold tabular-nums text-[5.4cqw] max-lg:text-4xl text-amber-100">{prev}</span>
            </div>
          </div>
        )}
        {flip && (
          <div className={`${half} bottom-0 z-10 mc-flip-bottom bg-gradient-to-b from-[#1d160e] to-[#150f09]`}>
            <div className={`${inner} bottom-0`}>
              <span className="font-semibold tabular-nums text-[5.4cqw] max-lg:text-4xl text-amber-100/90">{value}</span>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/70" />
        <div className={`absolute inset-0 rounded-lg ring-1 ring-inset ${t.line} pointer-events-none`} />
      </div>
      <span className={`text-[1.5cqw] max-lg:text-[10px] uppercase tracking-[0.28em] ${t.muted}`}>{label}</span>
    </div>
  );
}

function RingUnit({
  value,
  max,
  label,
  color,
  track,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  track: string;
}) {
  const pct = Math.min(1, value / max);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[9cqw] max-h-32 min-h-16 w-[9cqw] max-w-32 min-w-16">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke={track} strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.8,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-[2.6cqw] max-lg:text-xl font-semibold tabular-nums" style={{ color }}>
            {pad(value)}
          </span>
        </div>
      </div>
      <span className="text-[1.4cqw] max-lg:text-[10px] uppercase tracking-[0.3em] opacity-60">{label}</span>
    </div>
  );
}

export function Countdown({
  target,
  variant = "digits",
  tone = "dark",
  color,
}: {
  target: string;
  variant?: SiteSettings["countdown"]["style"];
  tone?: Tone;
  color?: string;
}) {
  const { days, hours, minutes, seconds, mounted } = useCountdown(target);
  const t = TONE[tone];
  const units = [
    { label: "Days", value: days, max: 365 },
    { label: "Hours", value: hours, max: 24 },
    { label: "Minutes", value: minutes, max: 60 },
    { label: "Seconds", value: seconds, max: 60 },
  ];

  if (variant === "flip") {
    return (
      <div className="flex items-start gap-[2cqw] max-lg:gap-3">
        {units.map((u) => (
          <FlipUnit key={u.label} value={pad(u.value)} label={u.label} tone={tone} />
        ))}
      </div>
    );
  }

  if (variant === "rings") {
    return (
      <div className={`flex flex-wrap items-start gap-[3cqw] max-lg:gap-5 ${t.text}`}>
        {units.map((u) => (
          <RingUnit
            key={u.label}
            value={mounted ? u.value : 0}
            max={u.max}
            label={u.label}
            color={color ?? "var(--mc-accent, #22d3ee)"}
            track={tone === "paper" || tone === "light" ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.12)"}
          />
        ))}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <p className={`font-mono text-[2.6cqw] max-lg:text-2xl tabular-nums ${t.text}`}>
        {mounted ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s` : "··d ··h ··m ··s"}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch gap-[1.6cqw] max-lg:gap-2.5">
      {units.map((u) => (
        <div
          key={u.label}
          className={`relative flex min-w-[13cqw] max-lg:min-w-[68px] flex-col items-center gap-1 rounded-2xl border px-[1.6cqw] py-[1.6cqw] max-lg:px-3 max-lg:py-2.5 ${t.panel}`}
        >
          <span className={`text-[4.6cqw] max-lg:text-3xl font-semibold leading-none tabular-nums ${t.text}`}>
            {mounted ? pad(u.value) : "--"}
          </span>
          <span className={`text-[1.4cqw] max-lg:text-[10px] uppercase tracking-[0.3em] ${t.muted}`}>{u.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------- forms ----------------------------------- */

export function NewsletterForm({
  s,
  tone = "dark",
  className = "",
  compact = false,
}: {
  s: SiteSettings;
  tone?: Tone;
  className?: string;
  compact?: boolean;
}) {
  const t = TONE[tone];
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      setMsg("Please enter a valid email address.");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, theme: s.activeTheme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setState("ok");
      setMsg(data.duplicate ? "You're already on the list — see you at launch." : s.newsletter.success);
      setEmail("");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "ok") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${t.panel} ${t.text} mc-reveal`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-400">
          <Check size={18} />
        </span>
        <p className="text-sm sm:text-base">{msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`w-full ${className}`}>
      <div
        className={`flex w-full flex-col gap-2 sm:flex-row ${compact ? "max-w-md" : "max-w-xl"} ${
          compact ? "text-sm" : ""
        }`}
      >
        <div className={`relative flex-1 ${compact ? "text-sm" : ""}`}>
          <Mail
            size={compact ? 14 : 18}
            className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 ${t.muted}`}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            placeholder={s.newsletter.placeholder}
            className={`w-full rounded-full border py-3 pr-4 pl-11 text-sm outline-none transition focus:border-current sm:text-base ${t.input} ${t.text}`}
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading"}
          className={`group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-70 sm:text-base ${t.btn}`}
        >
          {state === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Notify me
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-sm text-rose-400">{msg}</p>}
      {!compact && (
        <p className={`mt-3 text-xs ${t.muted}`}>
          One email at launch. No spam, unsubscribe in a click.
        </p>
      )}
    </form>
  );
}

export function ContactForm({ s, tone = "dark" }: { s: SiteSettings; tone?: Tone }) {
  const t = TONE[tone];
  const [form, setForm] = useState({ name: "", email: "", body: "" });
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send message");
      setState("ok");
      setMsg("Thanks — your message landed in our inbox.");
      setForm({ name: "", email: "", body: "" });
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Could not send message");
    }
  }

  return (
    <form onSubmit={submit} className={`w-full space-y-3 rounded-3xl border p-5 ${t.panel}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
          className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none ${t.input} ${t.text}`}
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
          className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none ${t.input} ${t.text}`}
        />
      </div>
      <textarea
        required
        rows={3}
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        placeholder="How can we help while we're offline?"
        className={`w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none ${t.input} ${t.text}`}
      />
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs ${state === "ok" ? "text-emerald-400" : state === "error" ? "text-rose-400" : t.muted}`}>
          {msg || tr(s, "replyDay")}
        </p>
        <button
          type="submit"
          disabled={state === "loading"}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-70 ${t.btn}`}
        >
          {state === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {tr(s, "send")}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------- widgets ---------------------------------- */

export function Progress({
  value,
  label,
  tone = "dark",
  color,
}: {
  value: number;
  label: string;
  tone?: Tone;
  color?: string;
}) {
  const t = TONE[tone];
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setW(value), 320);
    return () => clearTimeout(id);
  }, [value]);
  return (
    <div className="w-full max-w-xl">
      <div className={`mb-2 flex items-baseline justify-between text-xs uppercase tracking-[0.22em] ${t.muted}`}>
        <span>{label}</span>
        <span className={`font-mono text-sm tabular-nums ${t.text}`}>{value}%</span>
      </div>
      <div className={`h-2 w-full overflow-hidden rounded-full ${t.line}`}>
        <div
          className="relative h-full rounded-full"
          style={{
            width: `${w}%`,
            background: `linear-gradient(90deg, var(--mc-primary), ${color ?? "var(--mc-accent)"})`,
            transition: "width 1.4s cubic-bezier(0.2,0.8,0.2,1)",
          }}
        >
          <span
            className="absolute inset-0 animate-shimmer opacity-60"
            style={{
              background:
                "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.75) 50%, transparent 80%)",
              backgroundSize: "220% 100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const SOCIAL_ICONS: Record<string, string> = {
  x: "𝕏",
  instagram: "◎",
  github: "⌥",
  linkedin: "in",
  youtube: "▶",
};

export function SocialRow({ s, tone = "dark" }: { s: SiteSettings; tone?: Tone }) {
  const t = TONE[tone];
  const links = Object.entries(s.socials).filter(([, v]) => v && v.trim().length > 0);
  if (!s.socialsEnabled || links.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {links.map(([key, href]) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={`grid h-10 w-10 place-items-center rounded-full border text-sm transition hover:-translate-y-0.5 hover:border-current ${t.chip}`}
          title={key}
        >
          {SOCIAL_ICONS[key] ?? "•"}
        </a>
      ))}
    </div>
  );
}

export function ContactRow({ s, tone = "dark" }: { s: SiteSettings; tone?: Tone }) {
  const t = TONE[tone];
  if (!s.contact.enabled) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${t.muted}`}>
      {s.contact.email && (
        <a href={`mailto:${s.contact.email}`} className="inline-flex items-center gap-2 hover:text-current">
          <Mail size={15} /> {s.contact.email}
        </a>
      )}
      {s.contact.phone && (
        <a href={`tel:${s.contact.phone}`} className="inline-flex items-center gap-2 hover:text-current">
          <Phone size={15} /> {s.contact.phone}
        </a>
      )}
    </div>
  );
}

export function StatusPill({ s, tone = "dark" }: { s: SiteSettings; tone?: Tone }) {
  const t = TONE[tone];
  const label =
    s.mode === "maintenance"
      ? "Scheduled maintenance"
      : s.mode === "coming-soon"
        ? "Launching soon"
        : s.mode === "live"
          ? "We are live"
          : "Under construction";
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-[11px] font-medium tracking-[0.22em] uppercase ${t.chip}`}
    >
      <span className="relative grid h-2 w-2 place-items-center">
        <span className="absolute h-2 w-2 rounded-full bg-current opacity-70 animate-pulse-ring" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {s.copy.badge || label}
    </span>
  );
}

export function Ticker({
  items,
  tone = "dark",
  reverse = false,
  className = "",
}: {
  items: string[];
  tone?: Tone;
  reverse?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  const row = [...items, ...items];
  return (
    <div className={`mc-ticker-mask relative w-full overflow-hidden border-y py-3 ${t.line} ${className}`}>
      <div
        className="flex w-max animate-marquee gap-8 whitespace-nowrap will-change-transform"
        style={{ animationDirection: reverse ? "reverse" : "normal" }}
      >
        {row.map((item, i) => (
          <span key={i} className={`flex items-center gap-8 text-xs tracking-[0.32em] uppercase ${t.muted}`}>
            {item}
            <span className="opacity-40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Optional ambient hum toggled by the visitor (WebAudio, no assets). */
export function AmbientSound({ color }: { color?: string }) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ gain: GainNode; oscs: OscillatorNode[] } | null>(null);

  function toggle() {
    if (on) {
      nodesRef.current?.gain.gain.linearRampToValueAtTime(0, (ctxRef.current?.currentTime ?? 0) + 0.3);
      const n = nodesRef.current;
      setTimeout(() => n?.oscs.forEach((o) => o.stop()), 400);
      nodesRef.current = null;
      setOn(false);
      return;
    }
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = ctxRef.current ?? new Ctor();
    ctxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const oscs = [72, 108, 144.5].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.2);
    nodesRef.current = { gain, oscs };
    setOn(true);
    void color;
  }

  return (
    <button
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur transition hover:bg-white/12"
      title={on ? "Mute ambience" : "Play ambience"}
      aria-label={on ? "Mute ambience" : "Play ambience"}
    >
      <span className="flex items-end gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full bg-current ${on ? "animate-float" : ""}`}
            style={{ height: on ? 6 + i * 3 : 4 + i * 2, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </button>
  );
}

export function BrandMark({ s, tone = "dark" }: { s: SiteSettings; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold"
        style={{
          background: `linear-gradient(135deg, ${s.colors.primary}, ${s.colors.accent})`,
          color: "#fff",
          boxShadow: `0 10px 30px -10px ${s.colors.primary}`,
        }}
      >
        {s.brand.mark || s.brand.name.slice(0, 2)}
      </span>
      <span className="leading-tight">
        <span className={`block text-sm font-semibold tracking-wide ${t.text}`}>{s.brand.name}</span>
        <span className={`block text-[11px] tracking-[0.18em] uppercase ${t.muted}`}>{s.brand.tagline}</span>
      </span>
    </div>
  );
}

export function Address({ s, tone = "dark" }: { s: SiteSettings; tone?: Tone }) {
  const t = TONE[tone];
  if (!s.contact.enabled) return null;
  return (
    <p className={`inline-flex items-center gap-2 text-xs ${t.muted}`}>
      <MapPin size={13} /> Working remotely · {s.contact.email}
    </p>
  );
}

export function StageChildren({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/** Fires one analytics event per visitor page load. */
export function VisitTracker({ theme, path, enabled }: { theme: string; path: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const device = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1200 ? "tablet" : "desktop";
    fetch("/api/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme, path, device, referrer: document.referrer || "direct" }),
      keepalive: true,
    }).catch(() => {});
  }, [theme, path, enabled]);
  return null;
}

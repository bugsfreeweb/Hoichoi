"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Database, Loader2, Mail, Megaphone, MonitorSmartphone, Radio, Send } from "lucide-react";
import type { HoichoiStatus, SiteSettings } from "@/lib/types";
import { HOICHOI_PIPELINE, PIPELINE_STRIP, bnNum, brandName, loc, t, tagline } from "@/lib/types";
import { useCountdown } from "@/components/blocks";

/* ---------------------------------- logo ---------------------------------- */

export function HoiLogo({
  s,
  dark = false,
  size = "md",
}: {
  s: SiteSettings;
  dark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-8 w-8 text-[15px]" : size === "lg" ? "h-12 w-12 text-[22px]" : "h-10 w-10 text-[18px]";
  return (
    <span className="flex items-center gap-3">
      <span
        className={`font-serif-bn grid place-items-center rounded-full border-[1.5px] font-black ${dims} ${
          dark ? "border-[#c8f65d] bg-[#d2202c] text-[#f3eee1]" : "border-[#1a140d] bg-[#1a140d] text-[#c8f65d]"
        }`}
      >
        {s.brand.mark || "হ"}
      </span>
      <span className="leading-none">
        <span className={`font-serif-bn block font-extrabold ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"} ${size === "lg" ? "text-2xl" : "text-[17px]"}`}>
          {brandName(s)}
        </span>
        <span className={`font-mono-x mt-1 block text-[8.5px] tracking-[0.24em] uppercase ${dark ? "text-[#c8f65d]/70" : "text-[#6b6250]"}`}>
          {tagline(s)}
        </span>
      </span>
    </span>
  );
}

/* ------------------------------- breaking band ------------------------------ */

export function BreakingBand({ s, dark = false }: { s: SiteSettings; dark?: boolean }) {
  const copy = loc(s) === "bn" ? s.copyBn : s.copy;
  return (
    <div className={`hoi-breaking flex items-center justify-center gap-2.5 px-4 py-2 ${dark ? "" : ""}`}>
      <Megaphone size={13} className="shrink-0 text-white" />
      <p className="font-sans-bn text-[12.5px] font-bold tracking-wide text-white">
        {t(s, "breakingNews")} · {copy.badge}
      </p>
      <span className="hoi-live-dot ml-1 h-1.5 w-1.5 rounded-full bg-white text-white" />
    </div>
  );
}

/* ------------------------------ pipeline strip ------------------------------ */

export function PipelineStrip({ s, dark = false }: { s: SiteSettings; dark?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-[3cqw] py-2 max-lg:px-4 ${
        dark ? "border-t border-white/10 text-white/50" : "border-t border-[#1a140d]/10 text-[#1a140d]/50"
      }`}
    >
      <p className="font-mono-x text-[9.5px] tracking-[0.24em]">{PIPELINE_STRIP}</p>
      <p className="text-[11px]">
        {t(s, "lastRun")}: <span className={`font-semibold ${dark ? "text-[#c8f65d]" : "text-[#1a140d]"}`}>{s.hoichoi.lastRun}</span>
      </p>
    </div>
  );
}

/* ------------------------------ pipeline steps ------------------------------ */

export function PipelineSteps({ s, dark = false, compact = false }: { s: SiteSettings; dark?: boolean; compact?: boolean }) {
  const L = loc(s);
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
      {HOICHOI_PIPELINE.map((p, i) => (
        <div
          key={p.en}
          className={`relative overflow-hidden rounded-lg border p-2.5 ${
            dark ? "border-white/10 bg-white/[0.04]" : "border-[#1a140d]/12 bg-white/60"
          }`}
        >
          <p className={`font-mono-x text-[9px] ${dark ? "text-[#c8f65d]/60" : "text-[#d2202c]/70"}`}>
            0{i + 1}
          </p>
          <p className={`font-sans-bn mt-1 text-[12px] leading-tight font-bold ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>
            {L === "bn" ? p.bn : p.en}
          </p>
          <p className={`font-mono-x mt-1 text-[8px] tracking-[0.14em] ${dark ? "text-white/40" : "text-[#6b6250]"}`}>
            {p.sub}
          </p>
          <span
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-pulse"
            style={{ background: i < 4 ? "#c8f65d" : "#d2202c", animationDelay: `${i * 0.3}s` }}
          />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- status rows ------------------------------- */

function dot(status: HoichoiStatus): string {
  return status === "live" ? "bg-[#c8f65d]" : status === "checking" ? "bg-[#ffb454] animate-pulse" : "bg-[#f34f4f]";
}

function word(s: SiteSettings, status: HoichoiStatus): string {
  return status === "live" ? t(s, "connected") : status === "checking" ? t(s, "waiting") : t(s, "disconnected");
}

export function StatusGrid({ s, dark = false }: { s: SiteSettings; dark?: boolean }) {
  const rows = [
    { icon: Database, label: t(s, "turso"), sub: t(s, "checking"), status: s.hoichoi.turso },
    { icon: Radio, label: t(s, "api"), sub: "GET /api/stats · 10s", status: s.hoichoi.api },
    { icon: MonitorSmartphone, label: t(s, "collector"), sub: t(s, "heartbeatLost"), status: s.hoichoi.collector },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {rows.map((r) => (
        <div
          key={r.label}
          className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
            dark ? "border-white/10 bg-white/[0.04]" : "border-[#1a140d]/12 bg-white/70"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <r.icon size={15} className={dark ? "text-[#c8f65d]" : "text-[#d2202c]"} />
            <div>
              <p className={`font-sans-bn text-[12.5px] leading-tight font-bold ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>
                {r.label}
              </p>
              <p className={`font-mono-x mt-0.5 text-[9px] ${dark ? "text-white/40" : "text-[#6b6250]"}`}>{r.sub}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
              dark ? "bg-white/8 text-white/80" : "bg-[#1a140d]/6 text-[#1a140d]/80"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dot(r.status)}`} />
            {word(s, r.status)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- stat quartet ------------------------------ */

export function StatQuartet({ s, dark = false }: { s: SiteSettings; dark?: boolean }) {
  const L = loc(s);
  const stats = [
    { v: s.hoichoi.stats.collected, label: t(s, "collected"), c: "#c8f65d" },
    { v: s.hoichoi.stats.published, label: t(s, "published"), c: "#90afff" },
    { v: s.hoichoi.stats.duplicates, label: t(s, "duplicates"), c: "#ffb454" },
    { v: s.hoichoi.stats.comments, label: t(s, "comments"), c: "#f38e98" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((st) => (
        <div
          key={st.label}
          className={`relative overflow-hidden rounded-xl border p-3.5 text-center ${
            dark ? "border-white/10 bg-white/[0.04]" : "border-[#1a140d]/12 bg-white/70"
          }`}
        >
          <p className={`font-serif-bn hoi-tnum text-[26px] leading-none font-extrabold ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>
            {bnNum(st.v, L)}
          </p>
          <p className={`mt-1.5 text-[11px] ${dark ? "text-white/50" : "text-[#6b6250]"}`}>{st.label}</p>
          <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: st.c }} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ breaking ticker ----------------------------- */

export function HoiTicker({ s, dark = false }: { s: SiteSettings; dark?: boolean }) {
  const items = loc(s) === "bn" ? s.hoichoi.tickerBn : s.hoichoi.ticker;
  const row = [...items, ...items, ...items, ...items];
  return (
    <div
      className={`mc-ticker-mask relative w-full overflow-hidden border-y py-2.5 ${
        dark ? "border-white/10 bg-black/30" : "border-[#1a140d]/15 bg-[#1a140d]"
      }`}
    >
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap will-change-transform">
        {row.map((item, i) => (
          <span key={i} className="font-sans-bn flex items-center gap-10 text-[12px] font-bold tracking-[0.2em] text-[#f3eee1] uppercase">
            {item}
            <span className="text-[#d2202c]">▚</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- countdown -------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");

export function HoiCountdown({
  s,
  dark = false,
  variant,
}: {
  s: SiteSettings;
  dark?: boolean;
  variant?: SiteSettings["countdown"]["style"];
}) {
  const L = loc(s);
  const v = variant ?? s.countdown.style;
  const { days, hours, minutes, seconds, mounted } = useCountdown(s.countdown.target);
  const units = [
    { label: t(s, "days"), value: days, max: 99 },
    { label: t(s, "hours"), value: hours, max: 24 },
    { label: t(s, "minutes"), value: minutes, max: 60 },
    { label: t(s, "seconds"), value: seconds, max: 60 },
  ];
  const num = (n: number) => bnNum(pad(n), L);

  if (v === "inline") {
    return (
      <p className={`font-mono-x hoi-tnum text-xl sm:text-2xl ${dark ? "text-[#c8f65d]" : "text-[#1a140d]"}`}>
        {mounted ? `${bnNum(days, L)}${L === "bn" ? "দি" : "d"} ${num(hours)}:${num(minutes)}:${num(seconds)}` : "···"}
      </p>
    );
  }

  if (v === "rings") {
    return (
      <div className="flex flex-wrap items-start gap-5">
        {units.map((u) => {
          const r = 30;
          const c = 2 * Math.PI * r;
          const pct = Math.min(1, (mounted ? u.value : 0) / u.max);
          return (
            <div key={u.label} className="flex flex-col items-center gap-1.5">
              <div className="relative h-20 w-20">
                <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                  <circle cx="40" cy="40" r={r} fill="none" stroke={dark ? "rgba(255,255,255,0.12)" : "rgba(26,20,13,0.12)"} strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r={r} fill="none" stroke={dark ? "#c8f65d" : "#d2202c"} strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
                    style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.8,0.2,1)" }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <span className={`font-mono-x hoi-tnum text-lg font-bold ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>
                    {mounted ? num(u.value) : "––"}
                  </span>
                </div>
              </div>
              <span className={`font-mono-x text-[9px] tracking-[0.24em] uppercase ${dark ? "text-white/50" : "text-[#6b6250]"}`}>
                {u.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch gap-2.5">
      {units.map((u) => (
        <div
          key={u.label}
          className={`flex min-w-[76px] flex-col items-center gap-1 rounded-xl border px-4 py-3 ${
            dark ? "border-white/12 bg-white/[0.05]" : "border-[#1a140d]/15 bg-white/80"
          }`}
        >
          <span className={`font-serif-bn hoi-tnum text-3xl leading-none font-extrabold ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>
            {mounted ? num(u.value) : "––"}
          </span>
          <span className={`font-mono-x text-[9px] tracking-[0.24em] uppercase ${dark ? "text-[#c8f65d]/70" : "text-[#6b6250]"}`}>
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- newsletter -------------------------------- */

export function HoiNewsletter({ s, dark = false }: { s: SiteSettings; dark?: boolean }) {
  const L = loc(s);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      setMsg(t(s, "invalidEmail"));
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
      if (!res.ok) throw new Error(data.error ?? t(s, "disabled"));
      setState("ok");
      setMsg(data.duplicate ? (L === "bn" ? "আপনি আগেই তালিকায় আছেন — প্রথম পাতায় দেখা হচ্ছে।" : "You're already on the list.") : L === "bn" ? s.newsletter.successBn : s.newsletter.success);
      setEmail("");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : t(s, "disabled"));
    }
  }

  if (state === "ok") {
    return (
      <div className={`mc-reveal flex items-center gap-3 rounded-xl border px-4 py-3.5 ${dark ? "border-[#c8f65d]/30 bg-[#c8f65d]/10" : "border-[#5f8f0e]/30 bg-[#5f8f0e]/8"}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5f8f0e] text-white">
          <Check size={16} />
        </span>
        <p className={`font-sans-bn text-sm ${dark ? "text-[#f3eee1]" : "text-[#1a140d]"}`}>{msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail size={16} className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 ${dark ? "text-white/40" : "text-[#6b6250]"}`} />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            placeholder={s.newsletter.placeholder}
            className={`font-sans-bn w-full rounded-lg border py-3 pr-4 pl-11 text-sm outline-none transition ${
              dark
                ? "border-white/15 bg-black/40 text-[#f3eee1] placeholder:text-white/35 focus:border-[#c8f65d]/60"
                : "border-[#1a140d]/25 bg-white text-[#1a140d] placeholder:text-[#6b6250]/70 focus:border-[#1a140d]"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="font-sans-bn inline-flex items-center justify-center gap-2 rounded-lg bg-[#d2202c] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#a3121d] active:scale-[0.97] disabled:opacity-70"
        >
          {state === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {t(s, "notifyMe")}
        </button>
      </div>
      {state === "error" ? (
        <p className="font-sans-bn mt-2 text-[13px] text-[#d2202c]">{msg}</p>
      ) : (
        <p className={`font-sans-bn mt-2.5 text-[12px] ${dark ? "text-white/45" : "text-[#6b6250]"}`}>{t(s, "oneEmail")}</p>
      )}
    </form>
  );
}

/* ------------------------------ section eyebrow ----------------------------- */

export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`font-mono-x text-[10px] tracking-[0.3em] uppercase ${dark ? "text-[#c8f65d]/80" : "text-[#d2202c]"}`}>
      ▚ {children}
    </p>
  );
}

/* ------------------------------- hash stamp --------------------------------- */

export function HashStamp({ s, dark = false, hash = "a3f9·c41d·88e2" }: { s: SiteSettings; dark?: boolean; hash?: string }) {
  return (
    <span
      className={`hoi-stamp-in font-mono-x inline-flex -rotate-2 items-center gap-2 rounded-md border-2 px-3 py-1.5 text-[10.5px] font-bold tracking-[0.14em] uppercase ${
        dark ? "border-[#c8f65d]/70 text-[#c8f65d]" : "border-[#d2202c]/70 text-[#d2202c]"
      }`}
    >
      {t(s, "hashStamp")} · {hash}
      <ArrowRight size={12} />
    </span>
  );
}

/* ------------------------- live status polling hook ------------------------- */

export type PublicStatus = {
  mode: string;
  theme: string;
  target: string;
  turso: HoichoiStatus;
  api: HoichoiStatus;
  collector: HoichoiStatus;
  stats: { collected: number; published: number; duplicates: number; comments: number };
  lastRun: string;
  updatedAt: string;
};

/** Polls /api/status every 10s like the real front page (GET /api/stats · 10s). */
export function usePublicStatus(enabled = true): PublicStatus | null {
  const [st, setSt] = useState<PublicStatus | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as PublicStatus;
          if (alive) setSt(data);
        }
      } catch {
        /* keep last known — reliable degradation */
      }
    };
    void load();
    const id = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled]);
  return st;
}

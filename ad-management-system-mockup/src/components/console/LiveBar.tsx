"use client";

import { useEffect, useRef, useState } from "react";

interface Snap {
  ok: boolean;
  ts: string;
  slots: number;
  filled: number;
  empty: number;
  activeBookings: number;
  pending: number;
  review: number;
  impressions: number;
  clicks: number;
  expiringSoon: number;
  perSlot: { key: string; label: string; format: string; filled: boolean; ref: string | null; impressions: number; endsAt: string | null }[];
}

function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = target;
    if (a === b) return;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (b - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Metric({ label, value, tone = "ink" }: { label: string; value: number; tone?: "ink" | "lime" | "amber" | "red" }) {
  const n = useCountUp(value);
  const color = { ink: "var(--color-ink)", lime: "#037c1b", amber: "#b45309", red: "#d2202c" }[tone];
  return (
    <div className="flex min-w-[88px] flex-col">
      <span className="font-mono-x text-[8.5px] tracking-[0.2em] text-ink-soft uppercase">{label}</span>
      <span className="font-serif-bn text-[20px] leading-none font-black tabular-nums" style={{ color }}>
        {n.toLocaleString()}
      </span>
    </div>
  );
}

export default function LiveBar({ showSlots = true, intervalMs = 5000 }: { showSlots?: boolean; intervalMs?: number }) {
  const [snap, setSnap] = useState<Snap | null>(null);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/ads/status", { cache: "no-store" });
        const j = (await r.json()) as Snap;
        if (alive && j.ok) {
          setSnap(j);
          setBeat((b) => b + 1);
        }
      } catch {
        /* keep last good snapshot */
      }
    };
    pull();
    if (paused) return () => { alive = false; };
    const id = setInterval(pull, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs, paused]);

  const fillPct = snap ? Math.round((snap.filled / Math.max(1, snap.slots)) * 100) : 0;

  return (
    <section className="c-card mb-6 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/12 bg-ink px-4 py-2 text-paper">
        <span className="flex items-center gap-2">
          <span className="live-dot text-lime" />
          <b className="font-serif-bn text-[14px]">রিয়েল-টাইম অ্যাড সার্ভার</b>
          <span className="font-mono-x text-[9px] tracking-[0.2em] text-paper/45 uppercase">
            POLL {intervalMs / 1000}s · beat {beat}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono-x text-[9.5px] text-paper/55">
            {snap ? new Date(snap.ts).toLocaleTimeString("en-GB") : "connecting…"}
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="border border-paper/30 px-2 py-0.5 font-mono-x text-[9px] tracking-[0.16em] uppercase hover:bg-white/10"
          >
            {paused ? "▶ resume" : "⏸ pause"}
          </button>
        </span>
      </header>

      <div className="flex flex-wrap items-end gap-x-7 gap-y-4 p-4">
        <Metric label="লাইভ বুকিং" value={snap?.activeBookings ?? 0} tone="lime" />
        <Metric label="পূর্ণ স্লট" value={snap?.filled ?? 0} tone="lime" />
        <Metric label="খালি স্লট" value={snap?.empty ?? 0} />
        <Metric label="ইম্প্রেশন" value={snap?.impressions ?? 0} />
        <Metric label="ক্লিক" value={snap?.clicks ?? 0} />
        <Metric label="পেমেন্ট বাকি" value={snap?.pending ?? 0} tone="amber" />
        <Metric label="রিভিউ" value={snap?.review ?? 0} tone="amber" />
        <Metric label="৩ দিনে শেষ" value={snap?.expiringSoon ?? 0} tone="red" />

        <div className="ml-auto min-w-[180px] flex-1">
          <p className="flex justify-between font-mono-x text-[8.5px] tracking-[0.2em] text-ink-soft uppercase">
            ইনভেন্টরি পূর্ণতা<b className="text-ink">{fillPct}%</b>
          </p>
          <div className="mt-1.5 h-2 w-full overflow-hidden bg-ink/10">
            <div className="h-full bg-lime transition-[width] duration-700 ease-out" style={{ width: `${fillPct}%` }} />
          </div>
        </div>
      </div>

      {showSlots && snap ? (
        <div className="flex flex-wrap gap-1 border-t border-ink/12 p-3">
          {snap.perSlot.map((s) => (
            <span
              key={s.key}
              title={`${s.label}${s.ref ? ` · ${s.ref} · ${s.impressions.toLocaleString()} imp` : " · খালি (হাউস অ্যাড)"}`}
              className="flex items-center gap-1 border px-1.5 py-0.5 font-mono-x text-[8.5px] tracking-[0.1em] uppercase transition-colors"
              style={{
                borderColor: s.filled ? "#037c1b" : "rgba(26,20,13,.22)",
                background: s.filled ? "rgba(3,124,27,.09)" : "transparent",
                color: s.filled ? "#037c1b" : "var(--color-ink-soft)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.filled ? "#037c1b" : "rgba(26,20,13,.25)" }} />
              {s.key.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

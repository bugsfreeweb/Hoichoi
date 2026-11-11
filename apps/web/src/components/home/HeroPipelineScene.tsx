"use client";

import { useEffect, useState } from "react";
import { toBn } from "@/lib/format";

/**
 * Hero pipeline scene.
 *
 * Replaces the floating "window" collage that used to sit in the hero's right
 * column. The old cards were static decoration; this scene shows the actual
 * pipeline as plumbing — feed → dedupe → fact-gate → rewrite → publish — with
 * packets travelling the whole run, and the real collected/published/duplicate
 * counts as the only numbers on screen.
 *
 * Implementation notes:
 *  - Pure SVG + CSS. No canvas/RAF loop, so it costs nothing while idle and
 *    hydrates identically on server and client (no random geometry).
 *  - Every loop is transform/opacity only.
 *  - `prefers-reduced-motion` stops the motion but keeps the diagram.
 */

/** Node centres are hand-placed on the spine path so labels never drift off it. */
const NODES = [
  { id: "feed", bn: "ফিড", en: "FEED", color: "#22d3ee", x: 24, y: 34 },
  { id: "dedupe", bn: "ডুপ্লিকেট", en: "DEDUPE", color: "#fb7185", x: 100, y: 66 },
  { id: "fact", bn: "ফ্যাক্ট-গেট", en: "FACT", color: "#f5a524", x: 160, y: 92 },
  { id: "rewrite", bn: "পুনর্লিখন", en: "REWRITE", color: "#a855f7", x: 226, y: 124 },
  { id: "publish", bn: "প্রকাশ", en: "PUBLISH", color: "#34d399", x: 296, y: 150 },
] as const;

/** Fixed packet offsets — deterministic so SSR and hydration match. */
const PACKETS = [0, 0.18, 0.36, 0.54, 0.72, 0.9];

export default function HeroPipelineScene({
  collected,
  published,
  dups,
  lastRunIso,
}: {
  collected: number;
  published: number;
  dups: number;
  lastRunIso: string | null;
}) {
  const [tick, setTick] = useState(0);
  const [alive, setAlive] = useState(false);

  useEffect(() => {
    setAlive(true);
    const t = setInterval(() => setTick((n) => n + 1), 2400);
    return () => clearInterval(t);
  }, []);

  const counts: Record<string, number> = {
    feed: collected,
    dedupe: dups,
    fact: Math.max(0, collected - dups),
    rewrite: published,
    publish: published,
  };

  const active = tick % NODES.length;
  const lastRun = lastRunIso
    ? new Date(lastRunIso).toLocaleTimeString("bn-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="hf-pipeline-scene relative h-full w-full overflow-hidden rounded-2xl border border-ink/10">
      <div className="hf-pipe-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex h-full flex-col p-4 md:p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono-x text-[9px] tracking-[0.22em] text-ink/45 uppercase">PIPELINE · LIVE SCENE</p>
            <p className="mt-1 font-serif-bn text-[16px] leading-tight font-black text-ink">
              ফিড থেকে ফ্রন্টপেজ
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-lime/40 bg-lime/10 px-2.5 py-1 font-mono-x text-[8.5px] tracking-[0.16em] text-lime uppercase">
            <span className="hf-pipe-dot h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
            {lastRun ? `শেষ ${lastRun}` : "STANDBY"}
          </span>
        </header>

        {/* conveyor */}
        <div className="relative mt-5 flex-1">
          <svg viewBox="0 0 320 210" className="h-full w-full" role="img" aria-label="সংগ্রহ পাইপলাইন: ফিড, ডুপ্লিকেট, ফ্যাক্ট-গেট, পুনর্লিখন, প্রকাশ">
            <defs>
              <linearGradient id="hf-pipe-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.55" />
              </linearGradient>
            </defs>

            {/* spine */}
            <path
              d="M24 34 C 96 34, 96 92, 160 92 S 224 150, 296 150"
              fill="none"
              stroke="url(#hf-pipe-line)"
              strokeWidth="1.6"
              strokeDasharray="5 6"
              className={alive ? "hf-pipe-flow" : undefined}
            />
            <path
              d="M24 34 C 96 34, 96 92, 160 92 S 224 150, 296 150"
              fill="none"
              stroke="currentColor"
              className="text-ink/10"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.12"
            />

            {/* nodes */}
            {NODES.map((node, i) => {
              const { x, y } = node;
              const isActive = active === i;
              return (
                <g key={node.id}>
                  <circle cx={x} cy={y} r={isActive ? 5.4 : 4} fill={node.color} className={isActive ? "hf-pipe-ping" : undefined} />
                  <circle cx={x} cy={y} r="12" fill={node.color} opacity={isActive ? 0.18 : 0.09} />
                  <text
                    x={x + (i > 2 ? -14 : 14)}
                    y={y + 3}
                    textAnchor={i > 2 ? "end" : "start"}
                    className="font-mono-x"
                    style={{ fontSize: 7.5, letterSpacing: 0.8, fill: "var(--color-ink)", opacity: 0.62 }}
                  >
                    {node.en}
                  </text>
                </g>
              );
            })}

            {/* travelling packets */}
            {alive &&
              PACKETS.map((offset, i) => (
                <circle key={i} r="2" fill="#ffb454" className="hf-pipe-packet" style={{ animationDelay: `${offset * -6}s` }}>
                  <animateMotion
                    dur="6s"
                    repeatCount="indefinite"
                    begin={`${offset * 6}s`}
                    path="M24 34 C 96 34, 96 92, 160 92 S 224 150, 296 150"
                  />
                </circle>
              ))}
          </svg>
        </div>

        {/* counters — real numbers only */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink/10 pt-3">
          {[
            { label: "সংগৃহীত", value: collected, color: "text-ink" },
            { label: "ডুপ্লিকেট", value: dups, color: "text-alizarin" },
            { label: "প্রকাশিত", value: published, color: "text-lime" },
          ].map((k) => (
            <div key={k.label}>
              <p className="font-mono-x text-[8px] tracking-[0.16em] text-ink/40 uppercase">{k.label}</p>
              <p className={`mt-0.5 font-display text-[19px] leading-none font-bold ${k.color}`}>{toBn(k.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

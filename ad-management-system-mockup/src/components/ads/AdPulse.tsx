"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Snap {
  ok: boolean;
  slots: number;
  filled: number;
  empty: number;
  impressions: number;
}

/**
 * Public-facing live inventory pulse shown on /advertise — proves to
 * prospective advertisers that the ad server is running and shows how
 * many slots are still open right now.
 */
export default function AdPulse() {
  const [s, setS] = useState<Snap | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/ads/status", { cache: "no-store" });
        const j = (await r.json()) as Snap;
        if (alive && j.ok) {
          setS(j);
          setFlash(true);
          setTimeout(() => alive && setFlash(false), 450);
        }
      } catch {
        /* ignore */
      }
    };
    pull();
    const id = setInterval(pull, 7000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const pct = s ? Math.round((s.filled / Math.max(1, s.slots)) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border border-white/15 bg-white/[0.04] px-4 py-3">
      <span className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.22em] text-lime uppercase">
        <span className="live-dot text-lime" />
        LIVE AD SERVER
      </span>

      <span className="flex items-baseline gap-1.5">
        <b className={`font-serif-bn text-[22px] leading-none font-black text-white ${flash ? "tick-num" : ""}`}>
          {s ? s.empty : "—"}
        </b>
        <span className="text-[11px] text-white/50">স্লট এখনই খালি</span>
      </span>

      <span className="flex items-baseline gap-1.5">
        <b className="font-serif-bn text-[22px] leading-none font-black text-lime">{s ? s.filled : "—"}</b>
        <span className="text-[11px] text-white/50">চলমান বিজ্ঞাপন</span>
      </span>

      <span className="flex items-baseline gap-1.5">
        <b className={`font-serif-bn text-[22px] leading-none font-black text-white ${flash ? "tick-num" : ""}`}>
          {s ? s.impressions.toLocaleString() : "—"}
        </b>
        <span className="text-[11px] text-white/50">মোট ইম্প্রেশন</span>
      </span>

      <span className="min-w-[150px] flex-1">
        <span className="flex justify-between font-mono-x text-[8.5px] tracking-[0.2em] text-white/40 uppercase">
          ইনভেন্টরি পূর্ণ<b className="text-lime">{pct}%</b>
        </span>
        <span className="mt-1 block h-1.5 w-full bg-white/10">
          <span className="block h-full bg-lime transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </span>
      </span>

      <Link href="/portal/studio" className="bg-lime px-4 py-2 text-[12px] font-bold text-night hover:bg-[#4a7009] hover:text-white">
        🎨 স্টুডিওতে বানান
      </Link>
    </div>
  );
}

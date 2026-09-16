"use client";

import { useEffect, useMemo, useState } from "react";
import { toBn } from "@/lib/format";

const TWO_HOURS = 2 * 60 * 60 * 1000;

export default function Countdown({
  lastRunIso,
  size = 104,
}: {
  lastRunIso: string | null;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { remaining, frac, next } = useMemo(() => {
    const base = lastRunIso ? new Date(lastRunIso).getTime() : now;
    let next = base + TWO_HOURS;
    while (next <= now) next += TWO_HOURS;
    const remaining = Math.max(0, next - now);
    return { remaining, frac: 1 - remaining / TWO_HOURS, next };
  }, [now, lastRunIso]);

  const totalSec = Math.floor(remaining / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const R = (size - 10) / 2;
  const C = 2 * Math.PI * R;
  const ring = "#c8f65d"; // dark mode lime ring

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="3"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            fill="none"
            stroke={ring}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono-x leading-none font-bold ${size > 80 ? "text-[15px]" : "text-[11px]"}`}>
            {toBn(pad(hh))}:{toBn(pad(mm))}:{toBn(pad(ss))}
          </span>
          <span className="mt-1 font-mono-x text-[8px] tracking-[0.2em] text-white/45 uppercase">
            NEXT SYNC
          </span>
        </div>
      </div>
      <div className="hidden flex-col gap-1 sm:flex">
        <span className="font-mono-x text-[9px] tracking-[0.22em] text-white/40 uppercase">
          পরবর্তী স্বয়ংক্রিয় রান
        </span>
        <span className="text-[12px] font-semibold">
          {new Date(next).toLocaleTimeString("bn-BD", {
            timeZone: "Asia/Dhaka",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          (ঢাকা)
        </span>
        <span className="font-mono-x text-[9.5px] text-white/40">
          cron: ম্যানুয়াল
        </span>
      </div>
    </div>
  );
}
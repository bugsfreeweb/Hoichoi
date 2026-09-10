import { useEffect, useMemo, useState } from "react";
import { toBn } from "../lib/format";

/**
 * Rolling "next sync" countdown — always targets the next pipeline_hours slot
 * after the last recorded pipeline run.
 */
export default function Countdown({
  lastRunIso,
  hours = 2,
  size = 108,
}: {
  lastRunIso: string | null;
  hours?: number;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const period = hours * 60 * 60 * 1000;

  const { remaining, frac, next } = useMemo(() => {
    const base = lastRunIso ? new Date(lastRunIso).getTime() : now;
    let next = base + period;
    while (next <= now) next += period;
    const remaining = Math.max(0, next - now);
    return { remaining, frac: 1 - remaining / period, next };
  }, [now, lastRunIso, period]);

  const totalSec = Math.floor(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(Math.floor(totalSec / 3600));
  const mm = pad(Math.floor((totalSec % 3600) / 60));
  const ss = pad(totalSec % 60);

  const R = (size - 10) / 2;
  const C = 2 * Math.PI * R;

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
            stroke="#c8f65d"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            className="countdown-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono-x text-[15px] leading-none font-bold text-white tabular-nums">
            {toBn(hh)}:{toBn(mm)}:{toBn(ss)}
          </span>
          <span className="mt-1.5 font-mono-x text-[8px] tracking-[0.2em] text-white/45 uppercase">
            NEXT SYNC
          </span>
        </div>
      </div>
      <div className="hidden flex-col gap-1 sm:flex">
        <span className="font-mono-x text-[9px] tracking-[0.22em] text-white/40 uppercase">
          পরবর্তী স্বয়ংক্রিয় রান
        </span>
        <span className="text-[12px] font-semibold text-white/85">
          {new Date(next).toLocaleTimeString("bn-BD", {
            timeZone: "Asia/Dhaka",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          (ঢাকা)
        </span>
        <span className="font-mono-x text-[9.5px] text-white/40">
          cron: 0 */{toBn(hours)} * * *
        </span>
      </div>
    </div>
  );
}
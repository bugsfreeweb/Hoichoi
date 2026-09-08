import { statsSnapshot } from "@hoichoi/db";
import { bnNum } from "@/lib/bn";
import { getSettings } from "@/lib/settings";

function timeToNextSync(hours: number): { secondsLeft: number; at: string } {
  const R = 3600 * 1000 * hours;
  const now = Date.now();
  const next = Math.ceil(now / R) * R;
  return {
    secondsLeft: Math.round((next - now) / 1000),
    at: new Date(next).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }),
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export async function LiveDeskMonitor() {
  let stats;
  let hours = 2;
  try {
    const [s, settings] = await Promise.all([statsSnapshot(), getSettings()]);
    stats = s;
    hours = settings.pipeline_hours;
  } catch {
    stats = null;
  }
  const { secondsLeft, at } = timeToNextSync(hours);
  const h = bnNum(Math.floor(secondsLeft / 3600));
  const m = bnNum(pad2(Math.floor((secondsLeft % 3600) / 60)));
  const s = bnNum(pad2(secondsLeft % 60));

  return (
    <div className="bg-ink p-6 text-paper">
      <p className="flex items-center gap-2 font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
        ডেস্ক মনিটর · লাইভ
      </p>
      <div className="mt-5">
        <div className="flex items-center gap-4">
          <div className="relative" style={{ width: 92, height: 92 }}>
            <svg width="92" height="92" className="-rotate-90">
              <circle cx="46" cy="46" r="41" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3"></circle>
              <circle cx="46" cy="46" r="41" fill="none" stroke="#c8f65d" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="257.61" strokeDashoffset="0" className="countdown-ring"></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono-x text-[15px] font-bold leading-none">{h}:{m}:{s}</span>
              <span className="mt-1 font-mono-x text-[8px] tracking-[0.2em] uppercase text-white/45">NEXT SYNC</span>
            </div>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <span className="font-mono-x text-[9px] tracking-[0.22em] uppercase text-white/40">পরবর্তী স্বয়ংক্রিয় রান</span>
            <span className="text-[12px] font-semibold">{at} (ঢাকা)</span>
            <span className="font-mono-x text-[9.5px] text-white/40">cron: 0 */{bnNum(hours)} * * *</span>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3 border-t border-white/12 pt-5 font-mono-x text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-white/50">COLLECTED TODAY</span>
          <span className="text-lime">{bnNum(stats?.collectedToday ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">DUPLICATES BLOCKED</span>
          <span className="text-amberx">{bnNum(stats?.duplicatesBlocked ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">DEDUP RATE</span>
          <span>{bnNum(stats?.dedupRate ?? 0)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">LAST RUN STATUS</span>
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${stats?.lastRunStatus === "failed" ? "bg-alizarin" : "bg-lime"}`}></span>
            {stats?.lastRunStatus === "failed" ? "FAILED" : stats?.lastRunStatus === "never" ? "NEVER" : "SUCCESS"}
          </span>
        </div>
      </div>
    </div>
  );
}
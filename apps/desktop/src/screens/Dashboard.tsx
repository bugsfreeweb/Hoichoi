import { useEffect, useState } from "react";
import { startPipeline, openAdmin } from "../lib/tauri";
import { getRunEnv, type CredentialName } from "../lib/vault";
import {
  KeyRound,
  Timer,
  Activity,
  Cpu,
  SquarePlay,
  Globe,
  Wifi,
  GitBranch,
} from "lucide-react";

export default function Dashboard({
  configured,
  refresh,
}: {
  configured: Partial<Record<CredentialName, boolean>>;
  refresh: () => Promise<void>;
}) {
  const count = Object.values(configured).filter(Boolean).length;
  const total = Object.keys(configured).length;

// live 2h-sync countdown (matches mockup "পরবর্তী সিঙ্ক · 0 */2 * * *")
  const [next, setNext] = useState("");
  const [frac, setFrac] = useState(1);
  useEffect(() => {
    const period = 2 * 60 * 60 * 1000;
    const tick = () => {
      const now = Date.now();
      const target = Math.ceil(now / period) * period;
      const diff = Math.max(0, target - now);
      setFrac(diff / period);
      const bn = (n: number) => n.toLocaleString("bn-BD", { minimumIntegerDigits: 2 });
      setNext(
        `${bn(Math.floor(diff / 3600000))}:${bn(Math.floor((diff % 3600000) / 60000))}:${bn(Math.floor((diff % 60000) / 1000))}`,
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const runNow = async () => {
    await startPipeline(await getRunEnv());
    await refresh();
  };

  const stats = [
    { label: "কনফিগারড কী", value: `${count}`, sub: `/${total} total`, icon: KeyRound, color: "text-lime" },
    { label: "স্বয়ংক্রিয় রান", value: "2h", sub: "GitHub Actions cron", icon: Activity, color: "text-sky-300" },
    { label: "রিটেনশন উইন্ডো", value: "7d", sub: "public + 30d archive", icon: Timer, color: "text-rose-300" },
    { label: "রিফ্রেশ", value: "LIVE", sub: "vault → env transpile", icon: Cpu, color: "text-amberx" },
  ];

  return (
    <div className="scroll-slim h-full space-y-4 overflow-auto p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-x text-[9.5px] tracking-[0.26em] text-lime uppercase">
            TAURI CONTROLLER · HOICHOI DESK · LIVE
          </p>
          <h2 className="mt-1 font-serif-bn text-[26px] font-black text-white">ডেস্ক মনিটর</h2>
        </div>
        <button
          onClick={() => void runNow()}
          className="flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-[12px] font-bold text-night transition-all hover:brightness-110"
        >
          <SquarePlay size={13} /> কালেক্টর খুলুন
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel rounded-xl p-4">
            <div className="flex items-center justify-between text-[11.5px] text-white/50">
              {s.label}
              <s.icon size={14} className={s.color} />
            </div>
            <p className="mt-2 font-serif-bn text-[26px] leading-none font-black text-white">{s.value}</p>
            <p className="mt-1.5 font-mono-x text-[9.5px] text-white/35 uppercase">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* next sync / countdown */}
        <div className="panel relative overflow-hidden rounded-xl p-5 lg:col-span-4">
          <p className="font-mono-x text-[9.5px] tracking-[0.22em] text-lime uppercase">
            পরবর্তী সিঙ্ক · 0 */2 * * *
          </p>
<div className="mt-4 flex items-center gap-4">
            <div className="relative" style={{ width: 92, height: 92 }}>
              <svg width="92" height="92" className="-rotate-90">
                <circle cx="46" cy="46" r="41" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <circle
                  cx="46"
                  cy="46"
                  r="41"
                  fill="none"
                  stroke="#c8f65d"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="257.61"
                  strokeDashoffset={257.61 * (1 - frac)}
                  className="countdown-ring"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-x text-[16px] leading-none font-bold text-white tabular-nums">{next}</span>
                <span className="mt-1 font-mono-x text-[8px] tracking-[0.22em] text-white/40 uppercase">NEXT SYNC</span>
              </div>
            </div>
            <div className="space-y-1 text-[10.5px] leading-relaxed text-white/50">
              <p>🔔 শেষ রান → commit → deploy</p>
              <p>🤖 LLM rewrites → fact-gate</p>
              <p>🌐 Vercel ISR · revalidate 300s</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => void runNow()}
              className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-[11.5px] font-bold text-night"
            >
              <SquarePlay size={11} /> এখনই রান করুন
            </button>
            <button
              onClick={() => void openAdmin("http://localhost:3070/admin")}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11.5px] font-bold text-white/75 hover:border-white/40"
            >
              <Globe size={11} /> ওয়েব ডেস্ক
            </button>
          </div>
        </div>

        {/* keychain / source health */}
        <div className="panel rounded-xl p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/40 uppercase">কিচেন স্বাস্থ্য</p>
            <span className="flex items-center gap-1.5 font-mono-x text-[9px] tracking-[0.14em] text-lime uppercase">
              <Wifi size={10} /> ENCRYPTED
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {Object.entries(configured).slice(0, 8).map(([name, ok]) => (
              <li key={name} className="flex items-center gap-3">
                <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-lime" : "bg-white/30"}`} />
                <span className="min-w-0 flex-1 truncate font-mono-x text-[11.5px] text-white/80">{name}</span>
                <span className="font-mono-x text-[9px] text-white/35">{ok ? "READY" : "—"}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* system map */}
        <div className="panel rounded-xl p-5 lg:col-span-4">
          <p className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/40 uppercase">সিস্টেম মানচিত্র</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void openAdmin("http://localhost:3070/admin")}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/75 hover:border-white/40"
            >
              <Globe size={11} /> অ্যাডমিন কনসোল →
            </button>
            <button
              onClick={() => void openAdmin("http://localhost:3070/system")}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/75 hover:border-white/40"
            >
              <GitBranch size={11} /> সিস্টেম ব্লুপ্রিন্ট →
            </button>
          </div>
          <p className="mt-4 text-[10.5px] leading-relaxed text-white/45">
            সোর্স ম্যানেজমেন্ট, মডারেশন কিউ, সাবমিশন, আর্কাইভ — সব অ্যাডমিন কাজ
            ওয়েব ডেস্কে হয়। Desktop → Turso → Vercel একই shared ডেটাবেজে চলে।
          </p>
        </div>
      </div>
    </div>
  );
}

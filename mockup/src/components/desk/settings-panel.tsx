"use client";

import { useState } from "react";
import { Camera, GitBranch, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { toBn } from "@/lib/format";

export default function SettingsPanel() {
  const [cron, setCron] = useState("0 */2 * * *");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temp, setTemp] = useState(0.3);
  const [gate, setGate] = useState(90);
  const [toggles, setToggles] = useState({
    shot: true,
    headless: true,
    commit: true,
    deploy: true,
    fact: true,
  });

  const flip = (k: keyof typeof toggles) =>
    setToggles((t) => ({ ...t, [k]: !t[k] }));

  return (
    <div className="scroll-slim h-full overflow-auto p-5">
      <p className="font-serif-bn text-[20px] font-black text-white">সেটিংস</p>
      <p className="mt-1 font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
        DESKTOP CONTROLLER · LOCAL PREFERENCES
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="panel rounded-xl p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white">
            <Timer size={14} className="text-amberx" /> শিডিউল
          </p>
          <label className="mt-4 block text-[11px] text-white/45">Cron (Asia/Dhaka)</label>
          <input
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-night px-3 py-2 font-mono-x text-[16px] text-white outline-none"
          />
          <p className="mt-2 text-[11.5px] text-white/40">
            প্রতি দুই ঘণ্টায় স্বয়ংক্রিয় রান। খালি রাখলে শুধু ম্যানুয়াল।
          </p>
        </section>

        <section className="panel rounded-xl p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white">
            <Sparkles size={14} className="text-rose-300" /> রিরাইট মডেল
          </p>
          <label className="mt-4 block text-[11px] text-white/45">LLM</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-[13px] text-white outline-none"
          >
            <option value="gpt-4o-mini">gpt-4o-mini · সাশ্রয়ী</option>
            <option value="gpt-4o">gpt-4o · উচ্চ গুণমান</option>
            <option value="claude-sonnet">claude-sonnet · দীর্ঘ বাংলা</option>
          </select>
          <label className="mt-4 flex items-center justify-between text-[11px] text-white/45">
            Temperature <span className="font-mono-x text-white/70">{temp.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            className="mt-1 w-full accent-[#c8f65d]"
          />
        </section>

        <section className="panel rounded-xl p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white">
            <ShieldCheck size={14} className="text-lime" /> ফ্যাক্ট-গেট
          </p>
          <label className="mt-4 flex items-center justify-between text-[11px] text-white/45">
            থ্রেশহোল্ড{" "}
            <span className="font-mono-x text-lime">০.{toBn(gate).padStart(2, "০")}</span>
          </label>
          <input
            type="range"
            min={70}
            max={99}
            value={gate}
            onChange={(e) => setGate(Number(e.target.value))}
            className="mt-1 w-full accent-[#c8f65d]"
          />
          <p className="mt-3 text-[12px] leading-relaxed text-white/45">
            স্কোর এর নিচে গেলে আইটেম <span className="text-amberx">pending</span> সারিতে
            যায় — লাইভে নয়। সংবেদনশীল অপরাধ/শিশু কনটেন্টে ০.৯০+ রাখুন।
          </p>
        </section>

        <section className="panel rounded-xl p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white">
            <Camera size={14} className="text-sky-300" /> পাইপলাইন টগল
          </p>
          <ul className="mt-4 space-y-3">
            {(
              [
                ["shot", "স্ক্রিনশট আর্কাইভ"],
                ["headless", "Playwright headless"],
                ["fact", "ফ্যাক্ট-গেট বাধ্যতামূলক"],
                ["commit", "অটো-কমিট GitHub"],
                ["deploy", "Vercel অটো-ডিপ্লয়"],
              ] as const
            ).map(([k, label]) => (
              <li key={k} className="flex items-center justify-between text-[12.5px]">
                <span className="text-white/70">{label}</span>
                <button
                  onClick={() => flip(k)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    toggles[k] ? "bg-lime" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all ${
                      toggles[k] ? "left-4.5" : "left-0.5"
                    }`}
                    style={{ left: toggles[k] ? 18 : 2 }}
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 font-mono-x text-[10px] text-white/35">
            <GitBranch size={11} /> repo: hoichoi-content · branch: main
          </p>
        </section>
      </div>
    </div>
  );
}

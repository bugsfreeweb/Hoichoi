"use client";

import { useState } from "react";
import { Check, Megaphone, MousePointerClick, RotateCw, TrendingUp } from "lucide-react";
import { toBn } from "@/lib/format";
import {
  AD_PLACEMENTS,
  AD_PLACEMENT_LABEL,
  analyticsTotals,
  readAdConfig,
  readAnalytics,
  resetAdConfig,
  resetAnalytics,
  saveAdConfig,
  type AdConfig,
  type AdPlacement,
} from "@/lib/ads";

/** Professional advertisement manager — shared by web admin & desktop settings. */
export default function AdsPanel() {
  const [config, setConfig] = useState<AdConfig>(() => readAdConfig());
  const [saved, setSaved] = useState(false);

  const analytics = readAnalytics();
  const totals = analyticsTotals(analytics);
  const ctr = totals.impressions ? Math.round((totals.clicks / totals.impressions) * 1000) / 10 : 0;

  const set = (patch: Partial<AdConfig>) => setConfig((c) => ({ ...c, ...patch }));
  const flipPlacement = (p: AdPlacement) =>
    setConfig((c) => ({ ...c, placements: { ...c.placements, [p]: !c.placements[p] } }));

  const save = () => {
    saveAdConfig(config);
    setSaved(true);
    try {
      window.dispatchEvent(new CustomEvent("hoichoi-ads:updated"));
    } catch {
      /* noop */
    }
    setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    const d = resetAdConfig();
    resetAnalytics();
    setConfig(d);
    try {
      window.dispatchEvent(new CustomEvent("hoichoi-ads:updated"));
    } catch {
      /* noop */
    }
  };

  const field = (label: string, value: string, key: "sponsor" | "headline" | "sub" | "cta" | "link") => (
    <label className="mt-3 block text-[11px] text-white/45">
      {label}
      <input
        type={key === "link" ? "url" : "text"}
        value={value}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={key === "link" ? "https://…" : ""}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white outline-none focus:border-amberx"
      />
    </label>
  );

  const switchBtn = (on: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-lime" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${on ? "left-[18px]" : "left-[2px]"}`} />
    </button>
  );

  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amberx/15 text-amberx">
          <Megaphone size={15} />
        </span>
        <div>
          <p className="font-serif-bn text-[17px] font-bold text-white">বিজ্ঞাপন ম্যানেজার</p>
          <p className="font-mono-x text-[9px] tracking-[0.2em] text-white/35 uppercase">
            PLACEMENTS · BRAND · ANALYTICS
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            <RotateCw size={12} /> ডিফল্টে ফিরুন
          </button>
          <button
            onClick={save}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold ${saved ? "bg-lime/20 text-lime" : "bg-amberx text-black"}`}
          >
            <Check size={12} />
            {saved ? "সংরক্ষিত ✓" : "সংরক্ষণ করুন"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
        {/* ---- placements & brand ---- */}
        <div>
          <div className="flex items-center justify-between border-b border-white/8 pb-2">
            <p className="flex items-center gap-2 text-[12px] font-bold text-white/85">
              <Megaphone size={12} className="text-amberx" /> লেআউট ও সক্রিয়তা
            </p>
            <label className="flex items-center gap-2 text-[10.5px] text-white/45">
              গ্লোবাল {switchBtn(config.enabled, () => set({ enabled: !config.enabled }))}
            </label>
          </div>
          <div className="mt-3 space-y-3">
            {AD_PLACEMENTS.map((p) => (
              <div key={p} className="flex items-center justify-between text-[12.5px]">
                <span className="text-white/75">{AD_PLACEMENT_LABEL[p]}</span>
                {switchBtn(config.placements[p], () => flipPlacement(p))}
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-white/8 pt-3">
            <p className="flex items-center gap-2 text-[12px] font-bold text-white/85">
              <TrendingUp size={12} className="text-lime" /> ব্র্যান্ড ও কনটেন্ট
            </p>
            {field("স্পনসর", config.sponsor, "sponsor")}
            {field("হেডলাইন", config.headline, "headline")}
            {field("সাবটেক্সট", config.sub, "sub")}
            {field("সিটিএ বাটন", config.cta, "cta")}
            {field("লিংক (ডেস্টিনেশন)", config.link, "link")}
          </div>
        </div>

        {/* ---- analytics ---- */}
        <div>
          <p className="flex items-center gap-2 border-b border-white/8 pb-2 text-[12px] font-bold text-white/85">
            <MousePointerClick size={12} className="text-sky-300" /> অ্যানালিটিক্স
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[9.5px] font-mono-x uppercase text-white/40">ইমপ্রেশন</p>
              <p className="mt-1 font-serif-bn text-[20px] font-black text-white">{toBn(totals.impressions)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[9.5px] font-mono-x uppercase text-white/40">ক্লিক</p>
              <p className="mt-1 font-serif-bn text-[20px] font-black text-lime">{toBn(totals.clicks)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[9.5px] font-mono-x uppercase text-white/40">CTR</p>
              <p className="mt-1 font-serif-bn text-[20px] font-black text-amberx">{toBn(ctr)}%</p>
            </div>
          </div>

          <p className="mt-3 text-[10.5px] text-white/40">প্রতি প্লেসমেন্ট (ইমপ্রেশন → ক্লিক)</p>
          <ul className="mt-2 divide-y divide-white/6">
            {AD_PLACEMENTS.map((p) => (
              <li key={p} className="flex items-center justify-between px-2 py-2 text-[11.5px]">
                <span className="text-white/60">{AD_PLACEMENT_LABEL[p]}</span>
                <span className="font-mono-x text-[10.5px] text-white/45">
                  {toBn(analytics.impressions[p])} → {toBn(analytics.clicks[p])}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.03] p-3 text-[10.5px] leading-relaxed text-white/45">
            <Megaphone size={12} className="mt-0.5 shrink-0 text-amberx" />
            ডেমো বিজ্ঞাপন — ইমপ্রেশন/ক্লিক এই ব্রাউজারে (localStorage) গণনা হয়।
            আসল অ্যাড-নেটওয়ার্ক যুক্ত করতে স্পনসর, হেডলাইন ও লিংক সেট করুন; স্লট
            বন্ধ রাখতে প্লেসমেন্ট টগল বন্ধ করুন।
          </p>
        </div>
      </div>
    </div>
  );
}
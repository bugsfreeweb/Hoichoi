import { useEffect, useState } from "react";
import { Check, Megaphone, RotateCw, TrendingUp } from "lucide-react";
import { settingsGet, settingsSet } from "../lib/tauri";
import { getRunEnv } from "../lib/vault";
import { toBn } from "../lib/format";

const SLOTS: { key: string; label: string; hint: string; placeholder: string }[] = [
  {
    key: "ad_leaderboard_html",
    label: "Leaderboard · হোমপেজ শীর্ষ",
    hint: "হিরো-র উপরে প্রশস্ত ব্যানার",
    placeholder: "<!-- AdSense / Adsterra leaderboard code -->",
  },
  {
    key: "ad_rect_html",
    label: "Rectangle 300×250 · পোস্ট পেজ",
    hint: "নিবন্ধ পেজের পাশে লম্বা কলাম",
    placeholder: "<!-- AdSense / Adsterra rectangle code -->",
  },
  {
    key: "ad_infeed_html",
    label: "In-feed · গ্রিড প্রতি ৪র্থ",
    hint: "সংবাদের গ্রিডে প্রতি ৪র্থ কার্ড",
    placeholder: "<!-- In-feed ad code -->",
  },
  {
    key: "ad_strip_html",
    label: "Strip · হোমপেজ নিচে",
    hint: "ব্যান্ড সেকশনের নিচে অনুভূমিক স্ট্রিপ",
    placeholder: "<!-- Strip ad code -->",
  },
];

/**
 * বিজ্ঞাপন ম্যানেজার — mockup desk parity, driven by the real settings DB.
 * Every empty slot falls back to the default sponsor card on the web.
 */
export default function Ads({ refreshBrand }: { refreshBrand?: () => Promise<void> }) {
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await settingsGet(await getRunEnv());
        const rec: Record<string, string> = {};
        for (const f of SLOTS) {
          const v = s[f.key];
          if (typeof v === "string" && v.trim() !== "") rec[f.key] = v;
        }
        if (alive) setSlots(rec);
      } catch (e) {
        if (alive) setErr(String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const live = (key: string) => (slots[key] ?? "").trim() !== "";
  const activeCount = SLOTS.filter((f) => live(f.key)).length;

  const toggle = (f: (typeof SLOTS)[number]) => {
    setErr(null);
    setSlots((prev) => ({ ...prev, [f.key]: "" }));
  };

  const save = async () => {
    setErr(null);
    try {
      const fields: Record<string, string> = {};
      for (const f of SLOTS) {
        const v = (slots[f.key] ?? "").trim();
        if (v !== "") fields[f.key] = v;
      }
      if (Object.keys(fields).length === 0) {
        setErr("কমপক্ষে একটি স্লটে অ্যাড কোড দিন, অথবা সব বন্ধ রাখতে ডিফল্টে ফিরুন।");
        return;
      }
      await settingsSet(await getRunEnv(), fields);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      if (refreshBrand) await refreshBrand();
    } catch (e) {
      setErr(String(e));
    }
  };

  const resetAll = async () => {
    setErr(null);
    setSlots({});
    await save();
  };

  return (
    <div className="scroll-slim h-full overflow-auto p-4">
      <div className="panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amberx/15 text-amberx">
            <Megaphone size={15} />
          </span>
          <div>
            <p className="font-serif-bn text-[17px] font-bold text-white">বিজ্ঞাপন ম্যানেজার</p>
            <p className="font-mono-x text-[9px] tracking-[0.2em] text-white/35 uppercase">
              PLACEMENTS · LIVE DB · {toBn(activeCount)}/{toBn(SLOTS.length)} স্লট সক্রিয়
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void resetAll()}
              className="flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
            >
              <RotateCw size={12} /> ডিফল্টে ফিরুন
            </button>
            <button
              onClick={() => void save()}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold ${
                saved ? "bg-lime/20 text-lime" : "bg-lime text-night hover:brightness-110"
              }`}
            >
              <Check size={12} />
              {saved ? "সংরক্ষিত ✓" : "সংরক্ষণ করুন"}
            </button>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between border-b border-white/8 pb-2">
              <p className="flex items-center gap-2 text-[12px] font-bold text-white/85">
                <Megaphone size={12} className="text-amberx" /> লেআউট ও সক্রিয়তা
              </p>
              <span className="font-mono-x text-[10px] text-white/40">
                {toBn(activeCount)}/{toBn(SLOTS.length)} চালু
              </span>
            </div>

            <ul className="mt-3 space-y-3">
              {SLOTS.map((f) => (
                <li key={f.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <div className="min-w-0">
                      <p className="text-white/80">{f.label}</p>
                      <p className="text-[10.5px] text-white/35">{f.hint}</p>
                    </div>
                    <button
                      onClick={() => toggle(f)}
                      aria-pressed={live(f.key)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        live(f.key) ? "bg-lime" : "bg-white/15"
                      }`}
                      title={live(f.key) ? "স্লট বন্ধ করুন" : "স্লট খুলুন"}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all ${
                          live(f.key) ? "left-[18px]" : "left-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                  {live(f.key) && (
                    <textarea
                      value={slots[f.key]}
                      onChange={(e) => setSlots((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={3}
                      className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-night px-3 py-2 font-mono-x text-[10.5px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-lime/50"
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="flex items-center gap-2 border-b border-white/8 pb-2 text-[12px] font-bold text-white/85">
              <TrendingUp size={12} className="text-lime" /> লাইভ অবস্থা ও নির্দেশিকা
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[9.5px] font-mono-x text-white/40 uppercase">সক্রিয়</p>
                <p className="mt-1 font-serif-bn text-[20px] font-black text-white">{toBn(activeCount)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[9.5px] font-mono-x text-white/40 uppercase">বন্ধ</p>
                <p className="mt-1 font-serif-bn text-[20px] font-black text-white/60">
                  {toBn(SLOTS.length - activeCount)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[9.5px] font-mono-x text-white/40 uppercase">মোড</p>
                <p className="mt-1 font-serif-bn text-[18px] font-black text-lime">LIVE DB</p>
              </div>
            </div>

            <p className="mt-3 flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.03] p-3 text-[10.5px] leading-relaxed text-white/45">
              <Megaphone size={12} className="mt-0.5 shrink-0 text-amberx" />
              প্রতিটি স্লটে আপনার অ্যাড-নেটওয়ার্কের (AdSense / Adsterra) HTML/JS কোড পেস্ট করুন।
              খালি স্লটে ওয়েব সাইট ডিফল্ট স্পনসর কার্ড দেখায়। কোডগুলো সেটিংস ডেটাবেসে
              (settings) সংরক্ষিত হয় — web ও desktop উভয়েই তাৎক্ষণিক কার্যকর।
            </p>

            {err && (
              <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">
                ✕ {err}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
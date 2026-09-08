"use client";

import { useEffect, useState } from "react";
import { Hash, Radio } from "lucide-react";
import Counter from "@/components/home/counter";
import { toBn } from "@/lib/format";

export type StreamItem = {
  id: number;
  title: string;
  sourceName: string;
  ago: string;
  hash: string;
};

const STAGES = ["FETCH", "SHOT", "HASH", "LLM", "SHIP"];
const STAGE_COLOR: Record<string, string> = {
  FETCH: "text-sky-300 border-sky-300/40",
  SHOT: "text-amberx border-amberx/40",
  HASH: "text-white/70 border-white/25",
  LLM: "text-rose-300 border-rose-300/40",
  SHIP: "text-lime border-lime/50",
};

export default function LiveStream({ items }: { items: StreamItem[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (items.length === 0) return;
    const t = setInterval(() => setTick((x) => x + 1), 2600);
    return () => clearInterval(t);
  }, [items.length]);

  const pool = items.length > 0 ? items : [];
  const rotated =
    pool.length > 0
      ? [...pool.slice(tick % pool.length), ...pool.slice(0, tick % pool.length)]
      : [];
  const shown = rotated.slice(0, 5);

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* stat band */}
      <div className="lg:col-span-5">
        <p className="font-mono-x text-[10.5px] tracking-[0.28em] text-lime uppercase">
          LIVE INTAKE · দিনভর কালেকশন চলছে
        </p>
        <h2 className="mt-3 font-serif-bn text-[34px] leading-[1.2] font-black text-white md:text-[46px]">
          ফিড থামে না — <span className="text-lime">ডেস্কও না।</span>
        </h2>
        <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-white/50">
          নিচের সারিটি সরাসরি কালেক্টরের মুখ — প্রতিটি আইটেম ফেচ হওয়ার সঙ্গে সঙ্গেই
          স্ক্রিনশট, হ্যাশ ও স্টেজ-ট্যাগ পেয়ে যায়। মিল পেলে প্রবেশ নেই; অনন্য হলে
          পুনর্লিখনের পথে।
        </p>

        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10">
          {[
            { l: "স্ক্যানড পোস্ট / সপ্তাহ", v: 2840, d: 0, s: "+" },
            { l: "ডুপ্লিকেট নির্ভুলতা", v: 99.2, d: 1, s: "%" },
            { l: "গড় প্রকাশনা সময়", v: 4.2, d: 1, s: " মি" },
            { l: "সক্রিয় ফেসবুক সোর্স", v: 10, d: 0, s: "টি" },
          ].map((s) => (
            <div key={s.l} className="bg-[#0c1017] p-5">
              <Counter
                end={s.v}
                decimals={s.d}
                suffix={s.s}
                className="font-serif-bn text-[30px] leading-none font-black text-white"
              />
              <p className="mt-2 font-mono-x text-[9px] tracking-[0.14em] text-white/40 uppercase">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* stream */}
      <div className="lg:col-span-7">
        <div className="panel overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 border-b border-white/8 px-5 py-3.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-alizarin opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-alizarin" />
            </span>
            <p className="font-mono-x text-[10px] tracking-[0.22em] text-white/60 uppercase">
              COLLECTION STREAM · তাজা থেকে পুরোনো
            </p>
            <span className="ml-auto flex items-center gap-1.5 font-mono-x text-[9.5px] text-lime">
              <Radio size={10} /> AUTO-REFRESH
            </span>
          </div>

          <ul className="divide-y divide-white/6">
            {shown.map((it, i) => {
              const stage = STAGES[(tick + i) % STAGES.length];
              return (
                <li
                  key={`${it.id}-${tick}`}
                  className={`rise-row group flex items-center gap-4 px-5 py-4 transition-colors ${
                    i === 0 ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                  }`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="font-mono-x text-[10px] text-white/25">
                    {toBn(String(i + 1).padStart(2, "0"))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-white/90">
                      {it.title}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[10.5px] text-white/40">
                      <span className="truncate">{it.sourceName}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-white/30" />
                      {it.ago}
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 font-mono-x text-[9.5px] text-amberx/70 sm:flex">
                    <Hash size={9} />
                    {it.hash.slice(0, 6)}
                  </span>
                  <span
                    className={`w-14 rounded-full border px-2 py-1 text-center font-mono-x text-[8.5px] tracking-[0.14em] ${STAGE_COLOR[stage]}`}
                  >
                    {stage} ✓
                  </span>
                  {i === 0 && (
                    <span className="rounded-full bg-alizarin px-2 py-0.5 text-[9px] font-bold text-white">
                      NEW
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="border-t border-white/8 px-5 py-3">
            <p className="font-mono-x text-[9px] tracking-[0.18em] text-white/30 uppercase">
              হ্যাশ যাচাই হয় DB-তে · মিলে গেলে এখানেই থামে
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

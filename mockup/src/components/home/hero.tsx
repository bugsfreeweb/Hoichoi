"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, AppWindow, Radio, Camera, CircleCheck } from "lucide-react";
import Counter from "@/components/home/counter";
import Countdown from "@/components/countdown";
import { BRAND } from "@/lib/brand";

const PHRASES = [
  "শহর ফিডে যা বলে, আমরা তা যাচাই করে লিখি।",
  "প্রতি ২ ঘণ্টা — স্ক্যান, স্ক্রিনশট, পুনর্লিখন, প্রকাশ।",
  "ডুপ্লিকেটের জায়গা নেই — হ্যাশ যা বলে, তাই।",
  "গুজব থামে ফ্যাক্ট-গেটে; সংবাদ উঠে ফ্রন্টপেজে।",
];

export default function Hero({
  lastRunIso,
  collected,
  published,
  dups,
  avgSec,
  featuredImg,
  featuredTitle,
}: {
  lastRunIso: string | null;
  collected: number;
  published: number;
  dups: number;
  avgSec: number;
  featuredImg: string | null;
  featuredTitle: string | null;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PHRASES.length), 3400);
    return () => clearInterval(t);
  }, []);

  const syncMin = avgSec / 60;

  return (
    <section className="bg-night-grid relative overflow-hidden">
      {/* drifting glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="drift absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-alizarin/20 blur-[110px]" />
        <div
          className="drift absolute -top-32 right-[-10%] h-[460px] w-[460px] rounded-full bg-lime/12 blur-[120px]"
          style={{ animationDelay: "-6s" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-12 lg:py-20">
        {/* left — kinetic copy */}
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-3 py-1 font-mono-x text-[10px] tracking-[0.2em] text-lime uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-lime opacity-70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-lime" />
              </span>
              ডেস্ক অনলাইন
            </span>
            {["0 */2 * * *", "SHA-256 DEDUP", "ISR LIVE"].map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 font-mono-x text-[9.5px] tracking-[0.18em] text-white/50 uppercase"
              >
                {c}
              </span>
            ))}
          </div>

          <h1 className="headline-grad mt-6 font-serif-bn text-[76px] leading-[0.92] font-black tracking-tight md:text-[120px]">
            হইচই<span className="text-alizarin">।</span>
          </h1>

          <div className="kin-mask mt-5 h-16 md:h-18">
            <p
              key={idx}
              className="kin-line font-serif-bn text-[19px] leading-[1.6] font-bold text-paper/90 md:text-[24px]"
            >
              {BRAND.tagline} — {PHRASES[idx]}
              <span className="caret" />
            </p>
          </div>

          <p className="mt-5 max-w-xl text-[13.5px] leading-relaxed text-white/55">
            হইচই প্রতি দুই ঘণ্টায় আপনার নির্বাচিত ফেসবুক পেজ-গ্রুপ স্ক্যান করে,
            প্রতিটি পোস্টের স্ক্রিনশট আর্কাইভ করে, হ্যাশ মিলিয়ে ডুপ্লিকেট বাদ দেয়,
            আর অপরাধ-শিশু-সমাজের গল্প সম্পাদকীয় মানের বাংলায় লিখে GitHub পথে
            Vercel-এ ছেপে দেয় — এক টাচও ছাড়া।
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "আজ সংগৃহীত", v: collected, d: 0, s: "" },
              { l: "লাইভ প্রকাশিত", v: published, d: 0, s: "" },
              { l: "ডুপ্লিকেট ব্লক", v: dups, d: 0, s: "" },
              { l: "গড় সিঙ্ক", v: syncMin, d: 1, s: " মি" },
            ].map((m) => (
              <div key={m.l} className="border-l border-white/12 pl-3">
                <Counter
                  end={m.v}
                  decimals={m.d}
                  suffix={m.s}
                  className="font-serif-bn text-[26px] leading-none font-black text-white md:text-[30px]"
                />
                <p className="mt-1.5 font-mono-x text-[9px] tracking-[0.16em] text-white/40 uppercase">
                  {m.l}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#latest"
              className="group flex items-center gap-2 bg-alizarin px-6 py-3.5 text-[13.5px] font-bold text-paper transition-colors duration-300 hover:bg-alizarin-deep"
            >
              সর্বশেষ সংগ্রহ পড়ুন
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </a>
            <Link
              href="/desk"
              className="beam flex items-center gap-2 rounded-md bg-white/[0.06] px-6 py-3.5 text-[13.5px] font-bold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/10"
            >
              <AppWindow size={15} className="text-lime" />
              হইচই ডেস্ক লঞ্চ
            </Link>
          </div>
        </div>

        {/* right — floating evidence stack */}
        <div className="relative hidden h-[440px] lg:col-span-5 lg:block">
          <div
            className="floaty absolute top-2 left-0 w-[300px]"
            style={{ "--fr": "-3deg", "--fd": "7s" } as CSSProperties}
          >
            <div className="tauri-win rounded-xl p-3.5">
              <p className="flex items-center gap-2 font-mono-x text-[9px] tracking-[0.2em] text-white/45 uppercase">
                <Radio size={10} className="text-sky-300" /> FEED IN · মিরপুর আপডেট
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/75">
                জরুরি!! বাচ্চা হারাইছে বিকেলের দিকে। শেয়ার করেন সবাই…
              </p>
            </div>
          </div>

          {featuredImg && (
            <div
              className="floaty absolute top-34 right-0 w-[270px]"
              style={{ "--fr": "2.5deg", "--fd": "8s", "--fdel": "-3s" } as CSSProperties}
            >
              <div className="tauri-win overflow-hidden rounded-xl">
                <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
                  <span className="flex items-center gap-1.5 font-mono-x text-[9px] tracking-[0.18em] text-white/45 uppercase">
                    <Camera size={10} className="text-amberx" /> SHOT_0011.PNG
                  </span>
                  <span className="font-mono-x text-[9px] text-lime">✓ 1.2s</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredImg}
                  alt=""
                  className="aspect-[16/10] w-full object-cover grayscale-[0.35] contrast-[1.05]"
                />
              </div>
            </div>
          )}

          {featuredTitle && (
            <div
              className="floaty absolute bottom-0 left-10 w-[300px]"
              style={{ "--fr": "-1.5deg", "--fd": "9s", "--fdel": "-5s" } as CSSProperties}
            >
              <div className="beam rounded-xl">
                <div className="tauri-win rounded-xl p-4">
                  <p className="flex items-center gap-1.5 font-mono-x text-[9px] tracking-[0.2em] text-lime uppercase">
                    <CircleCheck size={10} /> প্রকাশিত · শিশু সুরক্ষা
                  </p>
                  <p className="mt-2 line-clamp-2 font-serif-bn text-[15px] leading-snug font-bold text-white">
                    {featuredTitle}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* meta ribbon */}
      <div className="relative border-t border-white/8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="font-mono-x text-[9.5px] tracking-[0.24em] text-white/35 uppercase">
            FEED → SHOT → HASH → LLM → GIT → DEPLOY
          </p>
          <Countdown lastRunIso={lastRunIso} size={54} dark />
        </div>
      </div>
    </section>
  );
}

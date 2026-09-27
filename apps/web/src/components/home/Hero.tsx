"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import Counter from "@/components/home/counter";
import { useLiveData } from "./live-data";
import { timeBn } from "@/lib/bn";
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
  featuredImg,
  featuredTitle,
}: {
  lastRunIso: string | null;
  collected: number;
  published: number;
  dups: number;
  featuredImg: string | null;
  featuredTitle: string | null;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PHRASES.length), 3400);
    return () => clearInterval(t);
  }, []);

  const live = useLiveData();
  const summary = live?.data?.totals;

  return (
    <section className="bg-night-grid relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="drift absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-alizarin/20 blur-[110px]" />
        <div
          className="drift absolute -top-32 right-[-10%] h-[460px] w-[460px] rounded-full bg-lime/12 blur-[120px]"
          style={{ animationDelay: "-6s" } as CSSProperties}
        />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-3 py-1 font-mono-x text-[10px] tracking-[0.2em] text-lime uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-lime opacity-70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-lime" />
              </span>
              {live?.error ? "সংযোগ বিচ্ছিন্ন" : live?.paused ? "আপডেট বিরতিতে" : live?.data ? "লাইভ ডেটা সংযুক্ত" : "ডেটা যাচাই চলছে"}
            </span>
            {["HOICHOI NEWSROOM", "HOICHOI DATABASE", "HUMAN REVIEW"].map((c) => (
              <span
                key={c}
                className="rounded-full border border-ink/12 bg-ink/[0.04] px-3 py-1 font-mono-x text-[9.5px] tracking-[0.18em] text-ink/50 uppercase"
              >
                {c}
              </span>
            ))}
          </div>

          <h1 className="headline-grad mt-6 font-serif-bn text-[76px] leading-[0.92] font-black tracking-tight md:text-[120px]">
            হৈচৈ<span className="text-alizarin">!</span>
          </h1>

          <div className="kin-mask mt-5 h-16 md:h-18">
            <p
              key={idx}
              className="kin-line font-serif-bn text-[19px] leading-[1.6] font-bold text-ink/90 md:text-[24px]"
            >
              {BRAND.tagline} — {PHRASES[idx]}
              <span className="caret" />
            </p>
          </div>

          <p className="mt-5 max-w-xl text-[13.5px] leading-relaxed text-ink/55">
            শহরের ঘটনা, মানুষের কথা। হৈচৈয়ের সম্পাদকীয় ডেস্কে প্রতিটি খবর ও
            পাঠকের মন্তব্যের জন্য আছে আলাদা পর্যালোচনা। নিচের লাইভ গ্রাফে দেখুন
            ডাটাবেসে কত প্রতিবেদন জমেছে, কোনটি প্রকাশিত, আর আলোচনায় কী যোগ হলো।
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "সংগৃহীত রেকর্ড", v: summary?.collected ?? collected, d: 0, s: "" },
              { l: "প্রকাশিত প্রতিবেদন", v: summary?.published ?? published, d: 0, s: "" },
              { l: "ডুপ্লিকেট চিহ্নিত", v: summary?.duplicates ?? dups, d: 0, s: "" },
              { l: "অনুমোদিত মন্তব্য", v: summary?.approvedComments ?? 0, d: 0, s: "" },
            ].map((m) => (
              <div key={m.l} className="border-l border-ink/12 pl-3">
                <Counter
                  end={m.v}
                  decimals={m.d}
                  suffix={m.s}
                  className="font-serif-bn text-[26px] leading-none font-black text-ink md:text-[30px]"
                />
                <p className="mt-1.5 font-mono-x text-[9px] tracking-[0.16em] text-ink/40 uppercase">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
            <Link
              href="/desk"
              className="beam flex items-center gap-2 rounded-md bg-ink/[0.06] px-6 py-3.5 text-[13.5px] font-bold text-ink backdrop-blur-sm transition-colors duration-300 hover:bg-ink/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/></svg>
              হৈচৈ ডেস্ক লঞ্চ
            </Link>
          </div>
        </div>

        <div className="relative hidden h-[440px] lg:col-span-5 lg:block">
          <div
            className="floaty absolute top-2 left-0 w-[300px]"
            style={{ "--fr": "-3deg", "--fd": "7s" } as CSSProperties}
          >
            <div className="tauri-win rounded-xl p-3.5">
              <p className="flex items-center gap-2 font-mono-x text-[9px] tracking-[0.2em] text-ink/45 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7cc3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>
                FEED IN · মিরপুর আপডেট
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink/75">
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
                <div className="flex items-center justify-between border-b border-ink/8 px-3 py-2">
                  <span className="flex items-center gap-1.5 font-mono-x text-[9px] tracking-[0.18em] text-ink/45 uppercase">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffb454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="13" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/></svg>
                    SHOT_0011.PNG
                  </span>
                  <span className="font-mono-x text-[9px] text-lime">✓ 1.2s</span>
                </div>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>
                    প্রকাশিত · শিশু সুরক্ষা
                  </p>
                  <p className="mt-2 line-clamp-2 font-serif-bn text-[15px] leading-snug font-bold text-ink">
                    {featuredTitle}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative border-t border-ink/8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="font-mono-x text-[9.5px] tracking-[0.24em] text-ink/35 uppercase">
            FEED → SHOT → HASH → LLM → GIT → DEPLOY
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <span className="text-[11px] text-ink/40">সর্বশেষ নথিভুক্ত রান: {lastRunIso ? timeBn(lastRunIso) : "এখনো নেই"}</span>
            <a href="#live-insights" className="flex items-center gap-2 text-sm font-semibold text-lime">লাইভ গ্রাফ দেখুন
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-90"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
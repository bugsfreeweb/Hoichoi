import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MousePointer2, Radio, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { getSettings } from "@/lib/store";
import { loc } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { DesignCard } from "@/components/DesignCard";
import { HoiLogo, HoiTicker } from "@/components/hoichoi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ডিজাইন গ্যালারি — হৈচৈ রক্ষণাবেক্ষণ মকআপ",
  description: "আটটি অ্যানিমেটেড হৈচৈ রক্ষণাবেক্ষণ ডিজাইন: প্রথম পাতা, কালেক্টর টার্মিনাল, ব্রেকিং ব্যান্ড ও আরও অনেক।",
};

export default async function DesignsPage() {
  const s = await getSettings();
  const L = loc(s);

  const FX = [
    { icon: Sparkles, name: L === "bn" ? "পার্টিকেল ও ধুলোক্ষেত্র" : "Particle & dust fields", copy: L === "bn" ? "ইনটেনসিটি স্লাইডারের সাথে স্কেল হওয়া নির্ভরযোগ্য মোশন।" : "Seeded, hydration-safe motion that scales with the intensity slider." },
    { icon: Waves, name: L === "bn" ? "অরোরা ও নাইট ওয়াশ" : "Aurora & night washes", copy: L === "bn" ? "মরফিং ব্লব ও অ্যানিমেটেড মাল্টি-রেডিয়াল গ্রেডিয়েন্ট।" : "Morphing blobs and animated multi-radial gradients." },
    { icon: MousePointer2, name: L === "bn" ? "স্পটলাইট ও 3D টিল্ট" : "Spotlight & 3D tilt", copy: L === "bn" ? "পয়েন্টার-ট্র্যাকড আলো ও হিরো কার্ডে পার্সপেক্টিভ টিল্ট।" : "Pointer-tracked light plus perspective tilt on hero cards." },
    { icon: Radio, name: L === "bn" ? "গ্রেইন, স্ক্যানলাইন, টিকার" : "Grain, scanlines, tickers", copy: L === "bn" ? "ফিল্ম গ্রেইন, CRT লাইন ও ব্রেকিং নিউজ টিকার।" : "Film grain overlay, CRT lines and breaking-news tickers." },
  ];

  return (
    <main className="font-sans-bn min-h-[100dvh] bg-[#f3eee1] text-[#1a140d]">
      <div className="border-b-2 border-[#1a140d]/10 bg-[#f3eee1]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1a140d]/20 px-3.5 py-2 text-xs font-bold text-[#1a140d]/70 transition hover:border-[#1a140d] hover:text-[#1a140d]"
            >
              <ArrowLeft size={14} /> {L === "bn" ? "ভিজিটর পেজ" : "Visitor page"}
            </Link>
            <HoiLogo s={s} size="sm" />
            <div>
              <h1 className="font-serif-bn text-lg font-extrabold tracking-tight">
                {L === "bn" ? "ডিজাইন গ্যালারি" : "Design gallery"}
              </h1>
              <p className="text-xs text-[#6b6250]">
                {L === "bn"
                  ? `${THEMES.length}টি রক্ষণাবেক্ষণ মকআপ · কার্ডে হোভার করলে অ্যানিমেশন চলবে · ক্লিকে লাইভ হবে`
                  : `${THEMES.length} maintenance mockups · hover a card to run its animations · click to make it live`}
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-[#d2202c] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#a3121d]"
          >
            <ShieldCheck size={14} /> {L === "bn" ? "অ্যাডমিন সেটিংস" : "Admin settings"}
          </Link>
        </div>
      </div>

      {s.hoichoi.showTicker && <HoiTicker s={s} />}

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {THEMES.map((meta) => (
            <DesignCard key={meta.id} meta={meta} s={s} active={meta.id === s.activeTheme} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-2xl border-2 border-[#1a140d]/12 bg-white/70 p-7">
          <h2 className="font-mono-x text-[11px] font-bold tracking-[0.28em] text-[#d2202c] uppercase">
            ▚ {L === "bn" ? "ইফেক্ট লাইব্রেরি" : "Effect library"}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FX.map((f) => (
              <div key={f.name}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1a140d] text-[#c8f65d]">
                  <f.icon size={17} />
                </span>
                <p className="mt-3.5 text-sm font-bold">{f.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#6b6250]">{f.copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-7 border-t border-[#1a140d]/10 pt-5 text-xs text-[#6b6250]">
            {L === "bn" ? (
              <>প্রতিটি ইফেক্ট <Link href="/admin" className="font-bold text-[#1a140d] underline">অ্যাডমিন → ডিজাইন</Link> থেকে চালু/বন্ধ করা যায় — অ্যানিমেশন ইনটেনসিটি, ব্র্যান্ড রঙ, কপি, কাউন্টডাউন ও নিউজলেটারসহ।</>
            ) : (
              <>Every effect can be switched on or off from <Link href="/admin" className="font-bold text-[#1a140d] underline">Admin → Design</Link>, together with animation intensity, brand colours, copy, countdown and newsletter behaviour.</>
            )}
          </p>
          <p className="font-mono-x mt-3 text-[10px] tracking-[0.2em] text-[#6b6250]/70">
            FEED → SHOT → HASH → LLM → GIT → DEPLOY
          </p>
        </div>
      </section>
    </main>
  );
}

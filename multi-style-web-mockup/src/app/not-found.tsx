import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-5">
      <div aria-hidden className="dot-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative max-w-xl text-center">
        <p className="font-latin text-[clamp(5rem,18vw,10rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.16)]">
          404
        </p>
        <h1 className="font-display-bn mt-2 text-[clamp(1.8rem,4vw,2.8rem)] leading-tight text-mist-100">
          এই নথি ডাটাবেসে নেই
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-mist-400">
          হয়তো হ্যাশ-গেটে আটকে গেছে, নয়তো এখনো প্রকাশিত হয়নি। হৈচৈ ডেস্কে ফিরে গিয়ে সর্বশেষ সংগ্রহ দেখুন।
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-ink-950 transition-all hover:brightness-110"
            style={{ background: "var(--accent)" }}
          >
            <ArrowLeft className="h-4 w-4" /> হোমে ফিরুন
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-2.5 text-[14px] font-semibold text-mist-100 transition-all hover:border-white/30 hover:bg-white/5"
          >
            <Search className="h-4 w-4" /> অ্যাডমিন কনসোল
          </Link>
        </div>
      </div>
    </main>
  );
}

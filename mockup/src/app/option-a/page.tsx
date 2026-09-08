import type { Metadata } from "next";
import { ArrowLeft, Code2, ExternalLink, FileCode2 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "হইচই ডেস্ক — Option-A · Pure HTML/CSS/JS",
  description:
    "Option-A ডেস্কটপ কন্ট্রোলারের খাঁটি HTML/CSS/JS সংস্করণ — কোনো ফ্রেমওয়ার্ক ছাড়াই, লাইভ Postgres ডেটাসহ।",
};

/**
 * Fullscreen host for the framework-free Option-A build.
 * The app itself lives in /public/option-a.html (+ .css / .js) and runs
 * with zero React — this route only frames it with navigation.
 */
export default function OptionAPage() {
  return (
    <main className="flex h-[calc(100dvh-40px)] flex-col bg-[#07080c]">
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-white/10 bg-[#0a0c10] px-3 py-2">
        <Link
          href="/desk"
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          <ArrowLeft size={12} />
          React সংস্করণ (/desk)
        </Link>
        <span className="flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.2em] text-[#c8f65d] uppercase">
          <FileCode2 size={12} />
          Option-A · Pure HTML + CSS + JS · No framework · No build
        </span>
        <span className="hidden items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-0.5 font-mono-x text-[9px] tracking-[0.16em] text-white/50 uppercase md:flex">
          ☀⇄☾ থিম টগল · টাইটেলবারে
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono-x text-[9.5px] tracking-[0.16em] text-white/35 uppercase sm:inline">
            option-a.html · option-a.css · option-a.js
          </span>
          <a
            href="/option-a.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-[#c8f65d] px-3 py-1 text-[11.5px] font-bold text-[#0a0c10] transition-all hover:brightness-110"
          >
            <ExternalLink size={12} />
            Raw ফাইল খুলুন
          </a>
          <a
            href="/api/option-a"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            <Code2 size={12} />
            JSON API
          </a>
        </div>
      </div>
      <iframe
        title="হইচই ডেস্ক — Option-A (Pure HTML/CSS/JS)"
        src="/option-a.html"
        className="min-h-0 w-full flex-1 border-0"
        allow="clipboard-write"
      />
    </main>
  );
}

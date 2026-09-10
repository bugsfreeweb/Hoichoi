"use client";

import Link from "next/link";
import { MapPin, Hash, Timer, Globe2 } from "lucide-react";
import { CATEGORY_LABEL, toBn } from "@/lib/format";
import type { ArticleLite } from "@/lib/data";

interface ArticleCardProps {
  a: ArticleLite;
  index: number;
}

export default function ArticleCard({ a, index }: ArticleCardProps) {
  return (
    <Link
      href={`/news/${a.id}`}
      className="group block"
    >
      <div className="frame-press relative overflow-hidden">
        <div className="aspect-[16/9.5] overflow-hidden bg-paper-deep">
          <img
            src={a.imageUrl}
            alt={a.title}
            className="photo-grade h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
          <Globe2 size={9.5} /> SOURCE · FACEBOOK ARCHIVE
        </span>
        <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-alizarin px-2.5 py-1 text-[10px] font-bold text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>
          FACT-CHECKED
        </span>
      </div>
      <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
        <span>ছবি: {a.imageCredit} · প্রতীকী</span>
        <span className="font-mono-x tracking-wide">
          SHOT_{a.id.toString().padStart(4, "0")}.PNG · PLAYWRIGHT
          1440×900
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-white"
          style={{
            background: a.category === "crime" ? "#d2202c" : a.category === "child" ? "#60a5fa" : a.category === "family" ? "#2dd4bf" : "#fbbf24",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>
          {CATEGORY_LABEL[a.category] ?? a.category}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-ink-soft">
          <MapPin size={11.5} /> {a.location}
        </span>
      </div>
      <h3 className="mt-4 link-sweep inline font-serif-bn text-[22px] leading-[1.35] font-extrabold text-ink">
        {a.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">
        {a.dek}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/news/${a.id}`}
          className="group flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition-colors duration-300 hover:bg-alizarin"
        >
          পুরোটা পড়ুন
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
        </Link>
        <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] text-ink-soft">
          <Hash size={11} /> {a.hash.slice(0, 10)}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
          <Timer size={12} /> {toBn(a.readingMinutes)} মিনিট
        </span>
      </div>
    </Link>
  );
}
"use client";

import { useState } from "react";
import ArticleCard from "@/components/article-card";
import AdSlot from "@/components/ad-slot";
import { CATEGORY_LABEL, toBn } from "@/lib/format";
import type { ArticleLite } from "@/lib/data";

export default function ArticleGrid({
  articles,
  ads = false,
}: {
  articles: ArticleLite[];
  ads?: boolean;
}) {
  const cats = Array.from(new Set(articles.map((a) => a.category)));
  const [active, setActive] = useState<string>("all");

  const shown =
    active === "all" ? articles : articles.filter((a) => a.category === active);

  return (
    <div>
      {/* filter rail */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActive("all")}
          className={`rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-all duration-300 ${
            active === "all"
              ? "border-ink bg-ink text-paper"
              : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
          }`}
        >
          সব <span className="font-mono-x text-[10px] opacity-70">{toBn(articles.length)}</span>
        </button>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-all duration-300 ${
              active === c
                ? "border-ink bg-ink text-paper"
                : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
            }`}
          >
            {CATEGORY_LABEL[c] ?? c}{" "}
            <span className="font-mono-x text-[10px] opacity-70">
              {toBn(articles.filter((a) => a.category === c).length)}
            </span>
          </button>
        ))}
        <span className="ml-auto hidden font-mono-x text-[10px] tracking-[0.18em] text-ink-soft/70 uppercase md:block">
          FILTER · AUTO-CATEGORIZED BY LLM
        </span>
      </div>

      {/* grid */}
      <div
        key={active}
        className="grid-pop mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3"
      >
        {shown.map((a, i) => (
          <div key={a.id} className="grid-pop" style={{ animationDelay: `${(i % 6) * 60}ms` }}>
            <ArticleCard a={a} index={i} />
            {ads && i !== shown.length - 1 && (i + 1) % 4 === 0 && (
              <div className="mt-10">
                <AdSlot variant="infeed" />
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <p className="col-span-full py-16 text-center text-ink-soft">
            এই বিভাগে এখনও কোনো আইটেম নেই — পরের সিঙ্কে দেখুন।
          </p>
        )}
      </div>
    </div>
  );
}

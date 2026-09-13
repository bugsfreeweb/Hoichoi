"use client";

import { Fragment, useState } from "react";
import type { Post } from "@hoichoi/shared-types";
import ArticleCard from "@/components/ArticleCard";
import { AdSlot } from "@/components/AdSlot";
import { CATEGORY_LABEL, toBn } from "@/lib/format";

export default function ArticleGrid({
  posts,
  ads = false,
  adInfeedHtml = null,
}: {
  posts: Post[];
  ads?: boolean;
  adInfeedHtml?: string | null;
}) {
  const cats = Array.from(new Set(posts.map((a) => a.category)));
  const [active, setActive] = useState<string>("all");

  const shown =
    active === "all" ? posts : posts.filter((a) => a.category === active);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActive("all")}
          className={`rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-all duration-300 ${
            active === "all"
              ? "border-ink bg-ink text-paper"
              : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
          }`}
        >
          সব <span className="font-mono-x text-[10px] opacity-70">{toBn(posts.length)}</span>
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
              {toBn(posts.filter((a) => a.category === c).length)}
            </span>
          </button>
        ))}
        <span className="ml-auto hidden font-mono-x text-[10px] tracking-[0.18em] text-ink-soft/70 uppercase md:block">
          FILTER · AUTO-CATEGORIZED BY LLM
        </span>
      </div>

      <div
        key={active}
        className="grid-pop mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3"
      >
        {shown.map((a, i) => (
          <Fragment key={a.id}>
            <div className="grid-pop" style={{ animationDelay: `${(i % 6) * 60}ms` }}>
              <ArticleCard post={a} index={i} />
            </div>
            {ads && i !== shown.length - 1 && (i + 1) % 4 === 0 && (
              <div className="mt-10">
                <AdSlot variant="infeed" html={adInfeedHtml} />
              </div>
            )}
          </Fragment>
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
"use client";

import { Fragment, useState } from "react";
import type { CategoryMeta, CategorySlug, Post } from "@hoichoi/shared-types";
import { bnNum } from "@/lib/bn";
import { PostCard } from "./PostCard";
import { AdSlot } from "./AdSlot";

export function CollectionGrid({
  posts,
  cats,
}: {
  posts: Post[];
  cats: CategoryMeta[];
}) {
  const all: CategorySlug | "all" = "all";
  const [active, setActive] = useState<CategorySlug | "all">("all");
  const filtered = active === all ? posts : posts.filter((p) => p.category === active);
  const count = (c: CategorySlug | "all") =>
    c === all ? posts.length : posts.filter((p) => p.category === c).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActive("all")}
          className={`rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
            active === "all" ? "border-ink bg-ink text-paper" : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
          }`}
        >
          সব <span className="font-mono-x text-[10px] opacity-70">{bnNum(count("all"))}</span>
        </button>
        {cats.map((c) => (
          <button
            key={c.slug}
            onClick={() => setActive(c.slug)}
            className={`rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
              active === c.slug ? "border-ink bg-ink text-paper" : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink"
            }`}
          >
            {c.displayNameBn} <span className="font-mono-x text-[10px] opacity-70">{bnNum(count(c.slug))}</span>
          </button>
        ))}
        <span className="ml-auto hidden font-mono-x text-[10px] tracking-[0.18em] text-ink-soft/70 uppercase md:block">
          FILTER · AUTO-CATEGORIZED BY LLM
        </span>
      </div>

      <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((post, i) => (
          <Fragment key={post.id}>
            <PostCard post={post} cats={cats} />
            {(i + 1) % 4 === 0 && <AdSlot key={`ad-${post.id}`} variant="infeed" />}
          </Fragment>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-[14px] text-ink-soft">
          এই ক্যাটাগরিতে আপাতত কোনো পোস্ট নেই।
        </p>
      )}
    </>
  );
}
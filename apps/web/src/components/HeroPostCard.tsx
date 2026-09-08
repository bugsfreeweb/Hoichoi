import Link from "next/link";
import type { CategoryMeta, CurrentWindowPost, Post } from "@hoichoi/shared-types";
import { countdownBn, relativeBn, readMinutesBn, shortId, bnNum } from "@/lib/bn";
import { CategoryBadge } from "./CategoryBadge";
import { PostFigure } from "./PostFigure";

export function HeroPostCard({ post, cats }: { post: Post; cats: CategoryMeta[] }) {
  return (
    <div className="lg:col-span-8">
      <div className="flex flex-wrap items-center gap-3">
        <CategoryBadge slug={post.category} cats={cats} size="lg" />
        <span className="flex items-center gap-1 text-[12px] text-ink-soft">
          <svg xmlns="http://www.w3.org/2000/svg" width="11.5" height="11.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          ঢাকায় অবস্থান
        </span>
        <span className="font-mono-x text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">
          SYNCED {relativeBn(post.published_at)}
        </span>
      </div>
      <Link className="group mt-4 block" href={`/post/${post.slug}`}>
        <h2 className="link-sweep inline font-serif-bn text-[30px] font-extrabold leading-[1.3] text-ink md:text-[42px] md:leading-[1.28]">
          {post.title_bn}
        </h2>
      </Link>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        {post.summary_bn ?? post.body_bn}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link
          href={`/post/${post.slug}`}
          className="group flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition-colors duration-300 hover:bg-alizarin"
        >
          পুরোটা পড়ুন
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </Link>
        <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] text-ink-soft">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
          {shortId(post.id)}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>
          {bnNum(readMinutesBn(post.body_bn))} মিনিট পড়া
        </span>
      </div>
      <Link className="group mt-6 block" href={`/post/${post.slug}`}>
        <div className="frame-press relative overflow-hidden">
          {post.media_path && post.media_kind !== "none" ? (
            <PostFigure post={post} ratio="aspect-[16/8.2]" />
          ) : (
            <div className="aspect-[16/8.2] overflow-hidden bg-paper-deep" />
          )}
        </div>
        <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
          <span>{post.media_path ? "ছবি: সংগৃহীত · প্রতীকী" : "কেবল টেক্সট সংবাদ"}</span>
          <span className="font-mono-x tracking-wide">SHOT · PLAYWRIGHT CAPTURE</span>
        </p>
      </Link>
    </div>
  );
}

export function WindowBadge({ post }: { post: CurrentWindowPost }) {
  return (
    <span className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
      <span className="cat-dot bg-alizarin"></span>
      এই পোস্ট জানালায় আর {countdownBn(post.ttl_ms ?? 0)} — পরে আর্কাইভে চলে যাবে
    </span>
  );
}
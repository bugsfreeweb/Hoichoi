import Link from "next/link";
import type { Post } from "@hoichoi/shared-types";
import { CATEGORY_LABEL, CATEGORY_TINT, toBn } from "@/lib/format";
import { readMinutesBn, shortId } from "@/lib/bn";

interface ArticleCardProps {
  post: Post;
  index: number;
}

const Icons = {
  Globe: (
    <svg xmlns="http://www.w3.org/2000/svg" width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  ),
  Hash: (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/></svg>
  ),
  Timer: (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M10 2h4"/></svg>
  ),
  Pin: (
    <svg xmlns="http://www.w3.org/2000/svg" width="11.5" height="11.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
  ),
};

export default function ArticleCard({ post, index }: ArticleCardProps) {
  const tint = CATEGORY_TINT[post.category] ?? "#fbbf24";

  return (
    <Link href={`/post/${post.slug}`} className="group block">
      <div className="frame-press relative overflow-hidden">
        <div className="aspect-[16/9.5] overflow-hidden bg-paper-deep">
          {post.media_path && post.media_kind !== "none" ? (
            <img
              src={post.media_path}
              alt={post.title_bn}
              className="photo-grade h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <p className="text-center font-serif-bn text-[15px] font-bold leading-relaxed text-ink/40">
                {post.summary_bn?.slice(0, 80) ?? post.title_bn.slice(0, 60)}…
              </p>
            </div>
          )}
        </div>
        <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
          {Icons.Globe} SOURCE · {post.source_name}
        </span>
        <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-alizarin px-2.5 py-1 text-[10px] font-bold text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>
          FACT-CHECKED
        </span>
      </div>
      <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
        <span>পুনর্লিখন · প্রতীকী</span>
        <span className="font-mono-x tracking-wide">
          SHOT_{shortId(post.id).toUpperCase()} · PLAYWRIGHT
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-white"
          style={{ background: tint }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>
          {CATEGORY_LABEL[post.category] ?? post.category}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-ink-soft">
          {Icons.Pin} {post.source_name}
        </span>
      </div>
      <h3 className="mt-4 link-sweep inline font-serif-bn text-[22px] leading-[1.35] font-extrabold text-ink">
        {post.title_bn}
      </h3>
      <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">
        {post.summary_bn ?? post.body_bn}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="group flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition-colors duration-300 group-hover:bg-alizarin">
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
        </span>
        <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] text-ink-soft">
          {Icons.Hash} {shortId(post.id)}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
          {Icons.Timer} {toBn(readMinutesBn(post.body_bn))} মিনিট
        </span>
      </div>
    </Link>
  );
}
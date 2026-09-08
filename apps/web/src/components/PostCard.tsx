import Link from "next/link";
import type { CategoryMeta, Post } from "@hoichoi/shared-types";
import { relativeBn, readMinutesBn, shortId } from "@/lib/bn";
import { CategoryBadge } from "./CategoryBadge";
import { PostFigure, ReadStats } from "./PostFigure";

export function PostCard({ post, cats }: { post: Post; cats: CategoryMeta[] }) {
  return (
    <Link className="group flex h-full flex-col" href={`/post/${post.slug}`}>
      <div className="relative">
        {post.media_path && post.media_kind !== "none" ? (
          <PostFigure post={post} />
        ) : (
          <div className="relative overflow-hidden border-[1.5px] border-ink">
            <div className="aspect-[16/8.2] overflow-hidden bg-paper-deep">
              <div className="flex h-full items-center justify-center px-6">
                <p className="text-center font-serif-bn text-[15px] font-bold leading-relaxed text-ink/40">
                  {post.summary_bn?.slice(0, 80) ?? post.title_bn.slice(0, 60)}…
                </p>
              </div>
            </div>
          </div>
        )}
        <span className="absolute top-3 left-3">
          <CategoryBadge slug={post.category} cats={cats} />
        </span>
        <span className="absolute top-3 right-3 font-mono-x text-[10px] text-white/50 drop-shadow">
          {shortId(post.id)}
        </span>
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: `#${cats.find((c) => c.slug === post.category)?.dot ?? "0a0c10"}` }}>
          {cats.find((c) => c.slug === post.category)?.displayNameBn ?? post.category}
        </p>
        <h3 className="link-sweep mt-1.5 inline font-serif-bn text-[17px] font-extrabold leading-snug">
          {post.title_bn}
        </h3>
        <p className="line-clamp-3 mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          {post.summary_bn ?? post.body_bn}
        </p>
        <div className="mt-4 flex items-center justify-between text-[10.5px] text-ink-soft/80">
          <span>
            সূত্র: {post.source_name} · <span className="font-serif-bn">{post.original_author_name ?? "—"}</span>
          </span>
          <ReadStats minutes={readMinutesBn(post.body_bn)} />
        </div>
        <div className="mt-2 text-[10.5px] text-ink-soft/60">{relativeBn(post.published_at)}</div>
      </div>
    </Link>
  );
}
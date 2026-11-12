import { mediaUrl } from "@/lib/media";
import { bnNum } from "@/lib/bn";
import { MediaFrame } from "./MediaFrame";
import { sourceBadge } from "@/lib/source-meta";
import type { Post } from "@hoichoi/shared-types";

/**
 * পোস্টের চিত্র/ভিডিও — local store অথবা external (demo/pexels) URL.
 * টেক্সট-কেবল পোস্টে কাগজ-রঙের block.
 *
 * The badge used to say "SOURCE · FACEBOOK ARCHIVE" for every post; it now
 * reports the platform the URL actually points at (RSS, YouTube, X, …).
 */
export function PostFigure({
  post,
  ratio = "aspect-[16/9]",
  alt = "",
  cover = false,
}: {
  post: Post;
  ratio?: string;
  alt?: string;
  /** `true` for compact thumbnails/cards, where a full crop looks better. */
  cover?: boolean;
}) {
  const src = mediaUrl(post);
  return (
    <div className="relative overflow-hidden border-[1.5px] border-ink">
      {src ? (
        <MediaFrame
          src={src}
          alt={alt || post.title_bn}
          kind={post.media_kind === "video" ? "video" : "image"}
          heightClass={ratio}
          fit={cover ? "cover" : "contain"}
        />
      ) : (
        <div className={`${ratio} flex items-center justify-center overflow-hidden bg-paper-deep`}>
          <p className="px-6 text-center font-serif-bn text-[15px] leading-relaxed font-bold text-ink/40">
            “{post.title_bn.slice(0, 60)}…”
          </p>
        </div>
      )}
      <span className="pointer-events-none absolute right-3 bottom-3 z-[2] flex items-center gap-1.5 rounded-full bg-night/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-white uppercase backdrop-blur-sm">
        {sourceBadge(post, post.media_kind === "video" ? "video" : "image")}
      </span>
    </div>
  );
}

export function ReadStats({ minutes }: { minutes: number | string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>
      {bnNum(minutes)} মিনিট পড়া
    </span>
  );
}

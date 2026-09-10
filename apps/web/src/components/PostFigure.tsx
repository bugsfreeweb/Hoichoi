import { mediaUrl } from "@/lib/media";
import { bnNum } from "@/lib/bn";
import type { Post } from "@hoichoi/shared-types";

/**
 * পোস্টের চিত্র/ভিডিও — local store অথবা external (demo/pexels) URL.
 * টেক্সট-কেবল পোস্টে কাগজ-রঙের block.
 */
export function PostFigure({
  post,
  ratio = "aspect-[16/8.2]",
  alt = "",
}: {
  post: Post;
  ratio?: string;
  alt?: string;
}) {
  const src = mediaUrl(post);
  return (
    <div className="relative overflow-hidden border-[1.5px] border-ink">
      <div className={`${ratio} overflow-hidden bg-paper-deep`}>
        {src ? (
          post.media_kind === "video" ? (
            <video
              className="photo-grade h-full w-full object-cover"
              src={src}
              controls
              muted
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt || post.title_bn} className="photo-grade h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-center font-serif-bn text-[15px] font-bold leading-relaxed text-ink/40">
              “{post.title_bn.slice(0, 60)}…”
            </p>
          </div>
        )}
      </div>
      <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-night/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-white uppercase backdrop-blur-sm">
        {post.media_kind === "video" ? "VIDEO · SOURCE" : "SOURCE · FACEBOOK ARCHIVE"}
      </span>
    </div>
  );
}

export function DefaultPostFigure({ ratio = "aspect-[16/8.2]" }: { ratio?: string }) {
  return (
    <div className={`${ratio} overflow-hidden bg-paper-deep border-[1.5px] border-ink`}>
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-center font-serif-bn text-[15px] font-bold leading-relaxed text-ink/40">
          এই পোস্টে ছবি নেই — কেবল সংবাদ বিবরণ
        </p>
      </div>
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
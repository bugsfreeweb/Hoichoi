import type { Post } from "@hoichoi/shared-types";
import { mediaUrl } from "@/lib/media";
import { imageOrigin, type ImageOrigin } from "@/lib/image-origin";

/**
 * Admin thumbnail + provenance badge.
 *
 * Server component on purpose: every queue page already resolves its posts, so
 * the picture and the "where did this come from" badge cost no client JS. The
 * source matters to an operator (AI images may need regenerating, external links
 * can rot), which is why the badge is loud rather than a tooltip.
 */
export function AdminThumb({
  post,
  size = "md",
}: {
  post: Pick<Post, "media_path" | "media_kind" | "media_origin" | "title_bn">;
  size?: "sm" | "md" | "lg";
}) {
  const src = mediaUrl(post as Post);
  const dims = size === "sm" ? "h-12 w-[74px]" : size === "lg" ? "h-28 w-44" : "h-16 w-28";
  if (!src) {
    return (
      <span
        className={`${dims} flex shrink-0 items-center justify-center border border-dashed border-ink/25 bg-ink/[0.03] text-[9px] font-bold text-ink-soft`}
      >
        ছবি নেই
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={post.title_bn}
      loading="lazy"
      className={`${dims} shrink-0 border border-ink/20 bg-paper-deep object-cover`}
    />
  );
}

/** Small pill: মূল উৎস / AI তৈরি / অ্যাডমিন আপলোড / বাইরের লিংক / ছবি নেই. */
export function OriginBadge({
  post,
  className = "",
}: {
  post: Pick<Post, "media_path" | "media_kind" | "media_origin">;
  className?: string;
}) {
  const o: ImageOrigin = imageOrigin(post);
  return (
    <span
      title={o.hint}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${o.cls} ${className}`}
    >
      {o.key === "ai" ? "✦" : o.key === "external" ? "↗" : o.key === "admin" ? "⤒" : o.key === "none" ? "∅" : "⬇"}
      {o.labelBn}
    </span>
  );
}

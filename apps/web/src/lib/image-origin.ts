import type { Post } from "@hoichoi/shared-types";

/**
 * Where does a post's picture come from?
 *
 * `posts.media_origin` is authoritative (migration 023). Legacy rows have none,
 * so the path shape decides: an absolute http(s) URL was a link to somewhere
 * else, anything else was mirrored by the collector. The label matters to an
 * operator clearing the queue: "AI" images are the ones they may want to
 * regenerate, and "external" ones may break when the other site deletes them.
 */
export type ImageOriginKey = "collector" | "ai" | "admin" | "external" | "none";

export interface ImageOrigin {
  key: ImageOriginKey;
  labelBn: string;
  /** Tailwind classes for the badge (light-on-light, readable). */
  cls: string;
  hint: string;
}

const ORIGINS: Record<ImageOriginKey, ImageOrigin> = {
  collector: {
    key: "collector",
    labelBn: "মূল উৎস",
    cls: "bg-cat-blue/12 text-cat-blue border-cat-blue/35",
    hint: "সংগ্রাহক মূল পোস্ট থেকে ছবিটি এনেছে",
  },
  ai: {
    key: "ai",
    labelBn: "AI তৈরি",
    cls: "bg-alizarin/12 text-alizarin border-alizarin/40",
    hint: "AI দিয়ে তৈরি ছবি — পছন্দ না হলে আবার তৈরি করা যায়",
  },
  admin: {
    key: "admin",
    labelBn: "অ্যাডমিন আপলোড",
    cls: "bg-cat-teal/12 text-cat-teal border-cat-teal/40",
    hint: "অ্যাডমিন নিজে আপলোড করেছেন",
  },
  external: {
    key: "external",
    labelBn: "বাইরের লিংক",
    cls: "bg-amberx/14 text-ink border-amberx/45",
    hint: "বাইরের সাইটের URL — সাইটটি মুছে ফেললে ছবি হারাবে",
  },
  none: {
    key: "none",
    labelBn: "ছবি নেই",
    cls: "bg-ink/8 text-ink-soft border-ink/25",
    hint: "এই পোস্টে কোনো ছবি নেই",
  },
};

export function imageOrigin(post: Pick<Post, "media_path" | "media_kind" | "media_origin">): ImageOrigin {
  if (!post.media_path || post.media_kind === "none") return ORIGINS.none;
  const declared = post.media_origin as ImageOriginKey | null | undefined;
  if (declared && declared in ORIGINS) return ORIGINS[declared];
  return /^https?:\/\//i.test(post.media_path) ? ORIGINS.external : ORIGINS.collector;
}

/** True when the operator can sensibly regenerate the picture. */
export function canRegenerateImage(post: Pick<Post, "media_kind" | "media_origin">): boolean {
  return post.media_kind === "none" || imageOrigin({ media_path: "x", ...post }).key !== "admin";
}

import type { Post } from "@hoichoi/shared-types";
import { mediaUrl } from "@/lib/media";

/**
 * The picture on a console card, cropped to fill its frame.
 *
 * The old card put a fixed-size thumbnail (`h-28 w-44`) inside a 16:9 box, so
 * every photo was letterboxed inside a frame that was sometimes smaller and
 * sometimes larger than the image — the "ugly card view". A card cover should
 * own its box: `object-cover` at the box's own ratio, no border of its own, and
 * a neutral placeholder of exactly the same shape when there is no picture, so a
 * grid of cards stays a grid.
 *
 * The classes are written out rather than interpolated: Tailwind only generates
 * utilities it can see as literal text, so `aspect-[${ratio}]` would compile to
 * nothing and every cover would collapse.
 */
const RATIO: Record<string, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
};

export function PostCover({
  post,
  ratio = "16/9",
  className = "",
}: {
  post: Pick<Post, "media_path" | "media_kind" | "media_origin" | "title_bn">;
  ratio?: "16/9" | "4/3";
  className?: string;
}) {
  const box = RATIO[ratio] ?? RATIO["16/9"];
  const src = mediaUrl(post as Post);
  if (!src) {
    return (
      <div className={`flex ${box} w-full items-center justify-center bg-ink/5 text-[10px] font-bold text-ink-soft ${className}`}>
        ছবি নেই
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${box} w-full bg-ink/5 object-cover ${className}`}
    />
  );
}

/**
 * A single-glyph provenance mark for the small cards.
 *
 * It keeps `OriginBadge`'s meaning (AI / scraped / admin upload / external) in
 * the space a 200 px card actually has, with the full sentence in `title` and an
 * `aria-label` that names it. The visible glyph is decorative, so nothing here
 * breaks "the label must contain the visible text".
 */
export function OriginMark({ origin }: { origin: { key: string; labelBn: string; hint: string; cls: string } }) {
  return (
    <span
      title={`${origin.labelBn} — ${origin.hint}`}
      aria-label={origin.labelBn}
      role="img"
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${origin.cls}`}
    >
      {origin.key === "ai" ? "✦" : origin.key === "external" ? "↗" : origin.key === "admin" ? "⤒" : origin.key === "none" ? "∅" : "⬇"}
    </span>
  );
}

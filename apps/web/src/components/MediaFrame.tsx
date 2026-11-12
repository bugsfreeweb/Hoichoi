import type { CSSProperties } from "react";

/**
 * Editorial media frame.
 *
 * Every image surface (article hero, cards, category grid, related posts) used
 * to force the picture into a fixed 16:8.2 box with `object-contain`. Photos
 * with any other aspect ratio got wide dead bars and looked "wrong size /
 * ugly", while `object-cover` (the previous fix) cropped them.
 *
 * This frame solves both: the *same* image is painted twice — a blurred,
 * colour-matched copy fills the box (so there is no dead space and the frame
 * always looks intentional), and a crisp copy sits on top with `object-contain`
 * so nothing is ever cropped. High-resolution images still scale up to the full
 * frame width, so they fill the box instead of floating small in the middle.
 */
export function MediaFrame({
  src,
  alt,
  kind = "image",
  className = "",
  heightClass = "aspect-[16/9]",
  fit = "contain",
  priority = false,
  tint,
}: {
  src: string;
  alt: string;
  kind?: "image" | "video";
  className?: string;
  /** Outer box shape; keep an aspect ratio so the layout never jumps. */
  heightClass?: string;
  /** `cover` for thumbnails; `contain` preserves the original framing. */
  fit?: "contain" | "cover";
  priority?: boolean;
  /** Accent used for the ambient wash, usually the category colour. */
  tint?: string;
}) {
  const style = tint ? ({ "--mf-tint": tint } as CSSProperties) : undefined;
  return (
    <div className={`mf relative overflow-hidden ${heightClass} ${className}`} style={style}>
      {/* ambient wash — the same bytes, blurred, so no empty bars */}
      <div aria-hidden className="mf-ambient">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full scale-125 object-cover blur-2xl saturate-150" loading="lazy" />
      </div>
      <div aria-hidden className="mf-tint" />

      {kind === "video" ? (
        <video
          className="relative z-[1] h-full w-full bg-black object-contain"
          src={src}
          controls
          muted
          playsInline
        />
      ) : fit === "cover" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className="photo-grade relative z-[1] h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className="photo-grade relative z-[1] mx-auto h-full w-full object-contain"
        />
      )}
    </div>
  );
}

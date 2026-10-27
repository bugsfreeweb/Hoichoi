"use client";

import { useState } from "react";
import clsx from "clsx";

/**
 * Image with a graceful fallback when the source fails to load (broken URL,
 * missing media, CDN 404). Renders a neutral placeholder instead of a broken
 * image icon. Safe to use inside server components.
 */
export default function SafeImage({
  src,
  alt,
  className,
  fallback,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center bg-ink-800/60 text-center",
          className,
        )}
        aria-label={alt}
      >
        {fallback ?? <span className="font-serif-bn text-[13px] font-bold text-ink/40">{alt}</span>}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className={className}
      {...rest}
    />
  );
}

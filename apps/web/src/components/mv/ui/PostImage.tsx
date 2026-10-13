/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";

/**
 * Cover artwork for a report. Always renders a gradient scrim so Bangla
 * headlines stay readable on top of the photo in both themes.
 */
export default function PostImage({
  src,
  alt,
  ratio = "16/9",
  className,
  imgClassName,
  zoom = true,
  scrim = false,
  rounded = "rounded-xl",
  children,
}: {
  src: string;
  alt: string;
  ratio?: string;
  className?: string;
  imgClassName?: string;
  zoom?: boolean;
  scrim?: boolean;
  rounded?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={clsx("relative overflow-hidden bg-ink-800", rounded, className)}
      style={{ aspectRatio: ratio }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={clsx(
          "h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          zoom && "group-hover:scale-[1.07]",
          imgClassName,
        )}
      />
      {/* tonal wash keeps photos consistent with the newsroom palette */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45 mix-blend-multiply"
        style={{ background: "linear-gradient(160deg, transparent 35%, color-mix(in srgb, var(--accent) 40%, #05060a))" }}
      />
      {scrim ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(5,6,10,0.92) 4%, rgba(5,6,10,0.45) 42%, transparent 78%)" }}
        />
      ) : null}
      {children}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Article media viewer. The primary image keeps its exact production layout
 * (frame, aspect, caption) and is simply made clickable; extra gallery images
 * collected from the source post appear as a thumbnail strip beneath it. Any
 * image opens a full-page lightbox with keyboard/arrow navigation.
 */
export function PostGallery({
  primarySrc,
  primaryKind,
  title,
  author,
  hash,
  fallbackText,
  images,
}: {
  primarySrc: string | null;
  primaryKind: "image" | "video" | "none";
  title: string;
  author: string | null;
  hash: string;
  fallbackText: string;
  images: string[];
}) {
  const all = primarySrc && primaryKind !== "video" ? [primarySrc, ...images] : images;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const close = useCallback(() => setOpen(false), []);
  const step = useCallback(
    (dir: number) => setIndex((i) => (all.length ? (i + dir + all.length) % all.length : 0)),
    [all.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  const openAt = (src: string) => {
    const i = all.indexOf(src);
    setIndex(i < 0 ? 0 : i);
    setOpen(true);
  };

  return (
    <>
      <figure className="mx-auto mt-10 max-w-5xl">
        <div className="frame-press overflow-hidden">
          {primarySrc ? (
            primaryKind === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={primarySrc} controls muted playsInline className="photo-grade aspect-[16/8.4] w-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => openAt(primarySrc)}
                className="group relative block w-full cursor-zoom-in"
                aria-label="ছবিটি বড় করে দেখুন"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={primarySrc} alt={title} className="photo-grade aspect-[16/8.4] w-full object-cover" />
                <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-night/70 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-white uppercase opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  ⛶ বড় করুন
                </span>
              </button>
            )
          ) : (
            <div className="aspect-[16/8.4] w-full bg-paper-deep">
              <div className="flex h-full items-center justify-center px-6">
                <p className="text-center font-serif-bn text-[15px] font-bold leading-relaxed text-ink/40">{fallbackText}</p>
              </div>
            </div>
          )}
        </div>
        <figcaption className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/85">
          <span>ছবি: {author ?? "প্রতীকী"} · প্রতীকী</span>
          <span className="font-mono-x tracking-wide">SHOT_{hash.toUpperCase()}.PNG · PLAYWRIGHT CAPTURE · 1440×900</span>
        </figcaption>

        {images.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
              আরও ছবি · {images.length}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => openAt(src)}
                  className="group relative aspect-square cursor-zoom-in overflow-hidden border-[1.5px] border-ink/20 transition-colors hover:border-ink"
                  aria-label={`ছবি ${i + 1} বড় করে দেখুন`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${title} — ছবি ${i + 1}`} className="photo-grade h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </button>
              ))}
            </div>
          </div>
        )}
      </figure>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[22px] text-white transition-colors hover:bg-white/20"
            aria-label="বন্ধ করুন"
          >
            ✕
          </button>
          {all.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[26px] text-white transition-colors hover:bg-white/20 md:left-8"
                aria-label="আগের ছবি"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(1); }}
                className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[26px] text-white transition-colors hover:bg-white/20 md:right-8"
                aria-label="পরের ছবি"
              >
                ›
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={all[index]}
            alt={`${title} — ${index + 1}/${all.length}`}
            className="max-h-[90vh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 font-mono-x text-[11px] tracking-[0.16em] text-white/80">
            {index + 1} / {all.length}
          </span>
        </div>
      )}
    </>
  );
}

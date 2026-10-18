"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowUp } from "lucide-react";

/**
 * Global "back to top" pill. Mounted once in the public site shell (and the
 * mockup chrome) so every reader page gets it. It stays hidden until the page
 * has scrolled a screenful, then fades in at the bottom-right; clicking it
 * smooth-scrolls to the top. Colours use the theme `ink`/`paper` tokens so the
 * pill inverts cleanly between the light and dark palettes.
 */
export default function ScrollToTop({ label = "উপরে যান" }: { label?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={clsx(
        "fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink px-4 py-2.5 text-[12px] font-bold tracking-[0.02em] text-paper shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:border-alizarin/50 motion-reduce:transition-none",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp size={16} strokeWidth={2.6} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

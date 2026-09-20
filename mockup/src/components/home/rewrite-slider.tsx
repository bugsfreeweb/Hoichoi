"use client";

import { useEffect, useRef, useState } from "react";
import { MoveHorizontal, Sparkles, Rss } from "lucide-react";

export default function RewriteSlider({
  raw,
  headline,
  body,
  sourceName,
  location,
}: {
  raw: string;
  headline: string;
  body: string;
  sourceName: string;
  location: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(100);
  const dragging = useRef(false);

  // cinematic intro reveal
  useEffect(() => {
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (ts: number) => {
          const p = Math.min(1, (ts - start) / 1300);
          const eased = 1 - Math.pow(1 - p, 3);
          setX(100 - 58 * eased);
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.35 },
    );
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 100;
      setX(Math.max(6, Math.min(94, px)));
    };
    const up = () => (dragging.current = false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div className="select-none">
      <div
        ref={ref}
        className="relative min-h-[420px] overflow-hidden border-[1.5px] border-ink bg-paper-deep md:min-h-[380px]"
      >
        {/* LEFT (base) — raw feed */}
        <div className="absolute inset-0 p-6 md:p-10">
          <div className="tape max-w-md bg-white p-5 shadow-[0_10px_30px_rgba(26,20,13,0.12)]">
            <span className="inline-flex items-center gap-1.5 bg-[#1877f2] px-2.5 py-1 text-[10.5px] font-bold text-white">
              <Rss size={10} /> মূল ফেসবুক পোস্ট
            </span>
            <p className="mt-3 text-[13px] leading-relaxed whitespace-pre-line text-[#1c1e21]/85">
              {raw}
            </p>
            <p className="mt-4 border-t border-ink/10 pt-2 text-[10.5px] text-ink-soft">
              {sourceName} · ক্যাপশন অপরিশোধিত · বানান-ভুলসহ
            </p>
          </div>
          <p className="mt-3 inline-block bg-alizarin-deep px-3 py-1.5 text-[11px] font-bold text-white">
            A · কাঁচা ফিড
          </p>
        </div>

        {/* RIGHT — rewritten, clipped (fixed dark band, readable in both themes) */}
        <div
          className="absolute inset-0 bg-band p-6 md:p-10"
          style={{ clipPath: `inset(0 0 0 ${x}%)` }}
        >
          <span className="inline-flex items-center gap-1.5 bg-lime px-2.5 py-1 text-[10.5px] font-bold text-night">
            <Sparkles size={10} /> হৈচৈ সংস্করণ
          </span>
          <h3 className="mt-4 max-w-lg font-serif-bn text-[19px] leading-[1.45] font-black text-bandline md:text-[25px]">
            {headline}
          </h3>
          <p className="mt-4 max-w-md text-[13px] leading-[1.85] text-bandline/70">
            {body}
          </p>
          <p className="mt-5 font-mono-x text-[9.5px] tracking-[0.18em] text-lime/70 uppercase">
            ✓ FACT-GATE 0.94 · ✓ HASH UNIQUE · 📍 {location}
          </p>
          <span className="absolute right-6 bottom-6 font-serif-bn text-5xl font-black text-bandline/10 md:text-7xl">
            হ
          </span>
        </div>

        {/* handle */}
        <div
          role="slider"
          aria-label="তুলনা স্লাইডার"
          aria-valuenow={Math.round(x)}
          tabIndex={0}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          className="grip absolute top-0 bottom-0 z-10 w-9 -translate-x-1/2"
          style={{ left: `${x}%` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-lime" />
          <div className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lime text-night shadow-[0_8px_28px_rgba(200,246,93,0.45)]">
            <MoveHorizontal size={18} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center font-mono-x text-[9.5px] tracking-[0.22em] text-ink-soft uppercase">
        ⟵ হাতলটি ধরে টেনে কাঁচা ফিডের সঙ্গে তুলনা করুন ⟶
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const Icons = {
  Rss: (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
  ),
  Sparkles: (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 3.7c.3-1 .7-1.5 2.1-1.5S14.8 2.7 15 3.7c.2 1 .6 1.4 1.9 1.6 1 .2 1.4.4 1.4 1.7s-.4 1.5-1.4 1.7c-1.3.2-1.7.6-1.9 1.6-.3 1-.4 1.5-2 1.5s-1.7-.5-2-1.5c-.2-1-.6-1.4-1.9-1.6-1-.2-1.4-.4-1.4-1.7S5.1 5.5 6 5.3c1.3-.2 1.7-.6 1.9-1.6z"/><path d="M20 14a2 2 0 0 0-1.9-1.9c-1.3-.2-1.7-.6-1.9-1.9A2 2 0 0 0 14.3 8c1.3.2 1.7.6 1.9 1.9.2 1.3.6 1.7 1.9 1.9A2 2 0 0 0 20 14z"/></svg>
  ),
  MoveHorizontal: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/><path d="M12 5l7 7-7 7"/></svg>
  ),
};

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

  useEffect(() => {
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
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
        <div className="absolute inset-0 p-6 md:p-10" style={{ padding: "5% 10%" }}>
          <div className="tape max-w-md bg-white p-5 shadow-[0_10px_30px_rgba(26,20,13,0.12)]">
            <span className="inline-flex items-center gap-1.5 bg-[#1877f2] px-2.5 py-1 text-[10.5px] font-bold text-white">
              {Icons.Rss} মূল ফেসবুক পোস্ট
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

        <div
          className="absolute inset-0 bg-band p-6 md:p-10"
          style={{ padding: "5% 10%", clipPath: `inset(0 0 0 ${x}%)` }}
        >
          <span className="inline-flex items-center gap-1.5 bg-lime px-2.5 py-1 text-[10.5px] font-bold text-night">
            {Icons.Sparkles} হৈচৈ সংস্করণ
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
            {Icons.MoveHorizontal}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center font-mono-x text-[9.5px] tracking-[0.22em] text-ink-soft uppercase">
        ⟵ হাতলটি ধরে টেনে কাঁচা ফিডের সঙ্গে তুলনা করুন ⟶
      </p>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import type { Post } from "@hoichoi/shared-types";

function MoveIcon({ size = 18 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5 2.5 7 6 10.5" />
      <path d="M18 3.5 21.5 7 18 10.5" />
      <path d="M2.5 7h19" />
      <path d="M6 13.5 2.5 17 6 20.5" />
      <path d="M18 13.5l3.5 3.5L18 20.5" />
      <path d="M2.5 17h19" />
    </svg>
  );
}

function SparkIcon({ size = 10 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 13.7 8.3 20 10 13.7 11.7 12 18 10.3 11.7 4 10 10.3 8.3z" />
    </svg>
  );
}

function FeedIcon({ size = 10 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}

/** কাঁচা ফিড বাম, পুনর্লিখিত ডান — টেনে নিয়ে তুলনা। mockup/src/components/home/rewrite-slider.tsx এর সঠিক অনুবাদ। */
export function RewriteComparator({ post }: { post: Post }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [x, setX] = useState(100);

  // cinematic intro reveal
  useEffect(() => {
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e || !e.isIntersecting) return;
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

  const raw = post.summary_bn ?? post.body_bn.slice(0, 240);
  const body = post.body_bn.slice(0, 210);
  const author = post.original_author_name ?? post.source_name;

  return (
    <div className="select-none">
      <div
        ref={ref}
        className="relative min-h-[420px] overflow-hidden border-[1.5px] border-ink bg-paper-deep md:min-h-[380px]"
      >
        {/* LEFT (base) — raw feed */}
        <div className="absolute inset-0 p-6 md:p-10">
          <div className="tape max-w-md bg-white p-5 shadow-[0_10px_30px_rgba(26,20,13,0.12)]">
            <span className="inline-flex items-center gap-1.5 bg-fb px-2.5 py-1 text-[10.5px] font-bold text-white">
              <FeedIcon /> মূল ফেসবুক পোস্ট
            </span>
            <p className="mt-3 text-[13px] leading-relaxed whitespace-pre-line text-[#1c1e21]/85">{raw}</p>
            <p className="mt-4 border-t border-ink/10 pt-2 text-[10.5px] text-ink-soft">
              {author} · ক্যাপশন অপরিশোধিত · বানান-ভুলসহ
            </p>
          </div>
          <p className="mt-6 inline-block bg-alizarin px-3 py-1.5 text-[11px] font-bold text-white">A · কাঁচা ফিড</p>
        </div>

        {/* RIGHT — rewritten, clipped */}
        <div className="absolute inset-0 bg-ink p-6 md:p-10" style={{ clipPath: `inset(0 0 0 ${x}%)` }}>
          <span className="inline-flex items-center gap-1.5 bg-lime px-2.5 py-1 text-[10.5px] font-bold text-night">
            <SparkIcon /> হইচই সংস্করণ
          </span>
          <h3 className="mt-4 max-w-lg font-serif-bn text-[19px] leading-[1.45] font-black text-paper md:text-[25px]">
            {post.title_bn}
          </h3>
          <p className="mt-4 max-w-md text-[13px] leading-[1.85] text-white/65">{body}…</p>
          <p className="mt-5 font-mono-x text-[9.5px] tracking-[0.18em] text-lime/70 uppercase">
            FACT-GATE ✓ · HASH UNIQUE ✓ · {author}
          </p>
          <span className="absolute right-6 bottom-6 font-serif-bn text-5xl font-black text-white/10 md:text-7xl">হ</span>
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
            <MoveIcon />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center font-mono-x text-[9.5px] tracking-[0.22em] text-ink-soft uppercase">
        ⟵ হাতলটি ধরে টেনে কাঁচা ফিডের সঙ্গে তুলনা করুন ⟶
      </p>
    </div>
  );
}
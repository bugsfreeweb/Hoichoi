"use client";
import { useEffect, useRef, useState } from "react";
import { bnNum } from "@/lib/bn";

export default function Counter({ end, decimals = 0, duration = 1300, prefix = "", suffix = "", className = "" }: {
  end: number; decimals?: number; duration?: number; prefix?: string; suffix?: string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(end);
  const animated = useRef(false);
  const [value, setValue] = useState(end);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const update = (n: number) => { current.current = n; setValue(n); };
    if (!window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { update(end); return; }
    const previous = current.current;
    update(end);
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      observer.disconnect();
      const from = animated.current ? previous : 0;
      animated.current = true;
      const start = performance.now();
      function step(t: number) {
        const progress = Math.min(1, (t - start) / duration);
        update(from + (end - from) * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(step);
      }
      frame = requestAnimationFrame(step);
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [end, duration]);
  return <span ref={ref} className={`tabular-nums ${className}`} aria-label={`${prefix}${bnNum(end.toFixed(decimals))}${suffix}`}>{prefix}{bnNum(value.toFixed(decimals))}{suffix}</span>;
}
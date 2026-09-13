"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll reveal with hard guarantees (ported from mockup):
 *  1. No-JS / SSR: content is fully visible (CSS gates hiding behind `.js`).
 *  2. `prefers-reduced-motion`: visible immediately.
 *  3. Eager observer (threshold 0.05, -24px margin).
 *  4. Safety timeout (2.2s): even if the observer never fires, elements
 *     never stay invisible.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      !document.documentElement.classList.contains("js") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setInView(true);
      return;
    }

    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -24px 0px" },
    );
    io.observe(el);

    const failSafe = window.setTimeout(() => setInView(true), 2200);

    return () => {
      io.disconnect();
      window.clearTimeout(failSafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
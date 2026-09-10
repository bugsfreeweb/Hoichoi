"use client";

import { useRef, type ReactNode } from "react";

export default function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) scale(1.015)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el)
      el.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="tilt-pane"
    >
      {children}
    </div>
  );
}
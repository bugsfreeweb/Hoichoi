"use client";

import { useEffect, useState } from "react";

/** চুলের মতো 2.5px অ্যালিজারিন স্ক্রল-প্রগ্রেস বার — mockup/home/scroll-progress.
 *  টপবার (h-10 / 40px) নিচে ফিক্সড, জোওডার টপবার-এর নিচে থেকে আঁকা। */
export function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-10 z-[59] h-[2.5px] bg-black/20">
      <div
        className="h-full origin-left bg-alizarin transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${p})` }}
      />
    </div>
  );
}
"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { SiteSettings, ThemeId } from "@/lib/types";
import { BlueprintTheme, EditorialTheme, NeonTheme, TerminalTheme } from "./one";
import { AuroraTheme, FlipTheme, NebulaTheme, OrbitTheme } from "./two";

export const THEME_COMPONENTS: Record<ThemeId, ComponentType<{ s: SiteSettings }>> = {
  nebula: NebulaTheme,
  blueprint: BlueprintTheme,
  neon: NeonTheme,
  aurora: AuroraTheme,
  terminal: TerminalTheme,
  flip: FlipTheme,
  editorial: EditorialTheme,
  orbit: OrbitTheme,
};

export function ThemeView({ id, s }: { id: ThemeId; s: SiteSettings }) {
  const C = THEME_COMPONENTS[id] ?? EditorialTheme;
  return <C s={s} />;
}

/**
 * Renders a theme at a virtual 1600x1000 canvas and scales it down to fit its
 * parent box — this is what powers the gallery cards and the admin live preview.
 */
export function FitPreview({
  id,
  s,
  paused = false,
  className = "",
  virtual = { w: 1600, h: 1000 },
}: {
  id: ThemeId;
  s: SiteSettings;
  paused?: boolean;
  className?: string;
  virtual?: { w: number; h: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(width / virtual.w, height / virtual.h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [virtual.w, virtual.h]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${paused ? "mc-paused" : ""} ${className}`}>
      <div
        style={{
          width: virtual.w,
          height: virtual.h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <ThemeView id={id} s={s} />
      </div>
    </div>
  );
}

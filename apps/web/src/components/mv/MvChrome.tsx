import type { ReactNode } from "react";
import Ticker from "@/components/mv/site/Ticker";
import Navbar from "@/components/mv/site/Navbar";
import Footer from "@/components/mv/site/Footer";
import { MotionFlag, ScrollProgress } from "@/components/mv/ui/motion";
import { enabledFor, variantFor, type MvLive } from "@/lib/mv/variant";
import { DEFAULT_BRAND } from "@/lib/mv/settings";

/** Turns a hex accent into the soft tint used by mockup surfaces. */
function softAccent(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return "rgba(255, 92, 56, 0.16)";
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.16)`;
}

/** Mockup chrome: animated status flag, progress bar, ticker, navbar, footer —
 *  rendered only when the variant engine is active (see `isMvMode`). */
export default function MvChrome({
  live,
  children,
  accent,
}: {
  live: MvLive;
  children: ReactNode;
  accent?: string;
}) {
  const brand = DEFAULT_BRAND;
  const accentHex = accent && /^#?[0-9a-f]{6}$/i.test(accent.trim()) ? accent.trim() : brand.accent;
  return (
    <div
      data-mv
      style={{ "--accent": accentHex, "--accent-soft": softAccent(accentHex) } as React.CSSProperties}
    >
      <MotionFlag enabled={brand.motion} accent={accentHex} />
      <ScrollProgress />
      {enabledFor(live, "ticker") ? <Ticker variant={variantFor(live, "ticker")} /> : null}
      {enabledFor(live, "navbar") ? <Navbar variant={variantFor(live, "navbar")} /> : null}
      {children}
      {enabledFor(live, "footer") ? <Footer variant={variantFor(live, "footer")} /> : null}
    </div>
  );
}
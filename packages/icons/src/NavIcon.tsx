"use client";

import type { SVGProps } from "react";
import { NAV_ICONS, type NavIconName } from "./catalog";

/**
 * One nav glyph, drawn the same way everywhere.
 *
 * A component rather than `<SomeIcon />` at each call site because the three
 * things that used to drift — size, stroke weight and motion — are decided here
 * once. Call sites pass meaning (`name`), never styling.
 */
export function NavIcon({
  name,
  size = 16,
  active = false,
  settle = false,
  className,
  ...rest
}: {
  name: NavIconName;
  /** Optical size in px. The default matches the 12.5 px nav label. */
  size?: number;
  /** The row is the current screen: permanent, subtle emphasis. */
  active?: boolean;
  /** The row *became* the current screen: a one-shot settle. */
  settle?: boolean;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "name" | "size" | "ref">) {
  const Glyph = NAV_ICONS[name];
  return (
    <Glyph
      size={size}
      // 1.75 rather than 2: at 16 px a 2 px stroke fills the counters of dense
      // glyphs (folder-tree, sliders) and they go muddy in the light theme.
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
      className={["ic", active || settle ? "ic-lift" : "", active ? "ic-active" : "", settle ? "ic-settle" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

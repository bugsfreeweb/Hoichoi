"use client";

import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { HOME_META } from "@/lib/content";
import { isPanelEngine, normalizeLogoEngine, type LogoEngine } from "@/lib/logo";
import {
  Boot,
  Broadcast,
  Crt,
  Cube,
  CubeMark,
  Decode,
  Depth,
  Hologram,
  Led,
  Mark,
  Neon,
  Shine,
  Signal,
  type EngineProps,
} from "@/components/ui/LogoEngines";

export type { LogoEngine } from "@/lib/logo";
export type LogoFormat = "full" | "compact" | "stacked" | "wordmark" | "mark" | "masthead";

const SCENES: Record<LogoEngine, (p: EngineProps) => ReactNode> = {
  broadcast: Broadcast,
  signal: Signal,
  cube: Cube,
  depth: Depth,
  decode: Decode,
  crt: Crt,
  neon: Neon,
  hologram: Hologram,
  boot: Boot,
  led: Led,
  shine: Shine,
};

/**
 * হৈচৈ brand lockup.
 *
 * `size` is the mark size; type size is derived from the format so the same
 * scene reads correctly in a slim header and in a footer masthead.
 */
export default function BrandLogo({
  format = "full",
  engine = "shine",
  size = 38,
  animate = true,
  href = "/",
  className,
  showTagline = false,
  showChain = false,
  subLabel,
}: {
  format?: LogoFormat;
  engine?: LogoEngine | string;
  size?: number;
  animate?: boolean;
  href?: string | null;
  className?: string;
  showTagline?: boolean;
  showChain?: boolean;
  /** Replaces the small caption under the wordmark (defaults to HOICHOI FEED). */
  subLabel?: string;
}) {
  const id = normalizeLogoEngine(engine) ?? "shine";
  const stacked = format === "stacked";
  const masthead = format === "masthead";
  const px = masthead ? size * 1.5 : stacked ? size * 1.1 : size * 0.8;

  const caption = (
    <span className="mono-label block whitespace-nowrap text-mist-400">
      {showChain ? HOME_META.pipelineChain : subLabel ?? "HOICHOI FEED"}
    </span>
  );
  const tagline = <span className="block text-[14px] leading-snug text-mist-400">{HOME_META.tagline}</span>;

  const sub: ReactNode =
    format === "full" || stacked ? caption : masthead ? (showTagline ? tagline : caption) : null;

  let body: ReactNode;

  if (format === "mark") {
    body = id === "cube" ? <CubeMark size={size} animate={animate} /> : <Mark size={size} animate={animate} />;
  } else {
    const Scene = SCENES[id];
    const scene = (
      <Scene
        px={px}
        size={size}
        animate={animate}
        showMark={format !== "wordmark"}
        stacked={stacked}
        sub={isPanelEngine(id) ? null : sub}
      />
    );

    // Panel scenes draw their own dark screen; the caption sits beside/below it.
    body = isPanelEngine(id) ? (
      <span className={clsx("inline-flex flex-col gap-2.5", stacked || masthead ? "items-center text-center" : "items-start")}>
        {scene}
        {sub}
      </span>
    ) : (
      scene
    );
  }

  const shell = (
    <span className={clsx("inline-flex select-none items-center", className)}>{body}</span>
  );

  if (!href) return shell;
  return (
    <Link href={href} aria-label="হৈচৈ — হোমে যান" className="inline-flex">
      {shell}
    </Link>
  );
}

export { Mark as LogoMark };

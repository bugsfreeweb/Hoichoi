/**
 * The design-token layer of the dynamic poster.
 *
 * The art director returns meanings ("this is a tech story, urgent but calm");
 * this module turns them into the exact strings the HTML needs. It has no I/O,
 * so every layout decision can be unit-tested without a browser.
 */
import type {
  PosterAspect,
  PosterDesignLayout,
  PosterPalette,
  PosterTexture,
  PosterVisualStyle,
} from "@hoichoi/shared-types";
import { POSTER_PALETTES, paletteById } from "@hoichoi/shared-types";

export const DESIGN_FRAME = { width: 1920, height: 1080 } as const;
/** 4:5 portrait: the tallest feed frame Facebook and Instagram do not crop. */
export const DESIGN_PORTRAIT_FRAME = { width: 1080, height: 1350 } as const;
export const DESIGN_FRAMES = {
  "16:9": DESIGN_FRAME,
  "4:5": DESIGN_PORTRAIT_FRAME,
} as const;
/** The brief's `deviceScaleFactor: 2`. Exported so the test can assert it. */
export const DESIGN_SCALE = 2;

export type DesignFontFace = {
  family: string;
  weight: number;
  style?: "normal";
  dataUrl: string;
};

export interface DesignPosterContent {
  headline: string;
  highlightWord: string;
  bullets: string[];
  pullQuote: string | null;
  badgeText: string;
  footerText: string;
  layout: PosterDesignLayout;
  aspect: PosterAspect;
  palette: PosterPalette;
  visualStyle: PosterVisualStyle;
  texture: PosterTexture;
  /** `data:image/…;base64,…` for the focal visual, or null for the textured wash. */
  backgroundDataUrl: string | null;
  logoDataUrl: string | null;
  fonts: DesignFontFace[];
  brand: string;
  site: string;
  dateText?: string | null;
  /** Stable per-story seed for the texture and the barcode. */
  seed: string;
}

/** Safe-zone inset used by every layout (the brief's newspaper margin). */
export const SAFE = 64;
/** Portrait has less horizontal room, so its margin is a little tighter. */
export const SAFE_PORTRAIT = 48;

export function frameFor(aspect: PosterAspect): { width: number; height: number } {
  return DESIGN_FRAMES[aspect];
}

export function safeFor(aspect: PosterAspect): number {
  return aspect === "16:9" ? SAFE : SAFE_PORTRAIT;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Bangla numerals, for bullet counters and edition numbers. */
export function banglaNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!);
}

/**
 * Wrap the highlighted word in `<mark>` without breaking Bangla clusters.
 *
 * The model is told to copy `highlight_word` out of the headline, but it
 * sometimes returns a case- or space-variant. A missed highlight is cosmetic, so
 * this falls back to the longest word rather than throwing or marking a random
 * substring. The *first* occurrence is marked, which is how a sub-editor would
 * underline it.
 */
export function headlineHtml(headline: string, highlightWord: string): string {
  const safe = escapeHtml(headline);
  const candidates = [highlightWord.trim(), ...longestWords(headline, 3)];
  for (const candidate of candidates) {
    if (!candidate || candidate.length < 2) continue;
    const escaped = escapeHtml(candidate);
    const at = safe.indexOf(escaped);
    if (at < 0) continue;
    return `${safe.slice(0, at)}<mark class="hl">${escaped}</mark>${safe.slice(at + escaped.length)}`;
  }
  return safe;
}

function longestWords(text: string, count: number): string[] {
  return text
    .split(/[\s।,!?"'“”‘’()…:;]+/)
    .filter((w) => w.length >= 3)
    .sort((a, b) => b.length - a.length)
    .slice(0, count);
}

/**
 * Headline size by layout and character count.
 *
 * Bangla is dense: 60 characters is already two or three lines at this frame.
 * Spotlight and hero layouts can carry more type because their copy sits on its
 * own surface; the split layouts share the frame with a full-height image and
 * therefore start one step smaller.
 */
export function headlineSizeFor(
  layout: PosterDesignLayout,
  headline: string,
  aspect: PosterAspect = "16:9",
): number {
  const len = headline.replace(/\s+/g, " ").trim().length;
  const landscape: Record<PosterDesignLayout, [number, number, number]> = {
    hero_overlay_gradient: [98, 82, 66],
    breaking_spotlight: [86, 72, 58],
    editorial_magazine_grid: [92, 76, 60],
    split_left_media: [90, 74, 60],
    split_right_media: [90, 74, 60],
  };
  const portrait: Record<PosterDesignLayout, [number, number, number]> = {
    hero_overlay_gradient: [84, 72, 58],
    breaking_spotlight: [74, 64, 52],
    editorial_magazine_grid: [76, 66, 54],
    split_left_media: [72, 62, 52],
    split_right_media: [72, 62, 52],
  };
  const [short, medium, long] = (aspect === "4:5" ? portrait : landscape)[layout];
  if (len < 32) return short;
  if (len <= 52) return medium;
  return long;
}

/** Image aspect ratio the focal visual must be generated at. */
export function focalAspectFor(
  layout: PosterDesignLayout,
  aspect: PosterAspect = "16:9",
): "1:1" | "16:9" | "9:16" {
  const wide = layout === "hero_overlay_gradient" || layout === "breaking_spotlight";
  if (!wide) return "1:1";
  return aspect === "4:5" ? "9:16" : "16:9";
}

/** A palette by id, with the tech/navy palette as the never-fail default. */
export function resolvePalette(id: string | null | undefined): PosterPalette {
  return paletteById(id) ?? POSTER_PALETTES[0]!;
}

/** The CSS custom properties the brief asks the renderer to inject. */
export function paletteVars(palette: PosterPalette): Record<string, string> {
  return {
    "--bg-color": palette.bg,
    "--accent-color": palette.accent,
    "--card-bg": palette.cardBg,
    "--text-primary": palette.textPrimary,
    "--text-muted": palette.textMuted,
    "--hairline": "color-mix(in srgb, " + palette.textPrimary + " 22%, transparent)",
  };
}

/** Does this palette need white-on-accent, or ink-on-accent? */
export function onAccent(palette: PosterPalette): string {
  const hex = palette.accent.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0B0F14" : "#FFFFFF";
}

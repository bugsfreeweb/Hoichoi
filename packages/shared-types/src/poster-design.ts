/**
 * The dynamic poster's design vocabulary.
 *
 * This is a second, richer frame language next to `poster-frames.ts` (the four
 * hand-built editorial plates). The brief for the dynamic poster asks for five
 * *story-driven* layouts and five *mood-matched* palettes, chosen per article by
 * the art director rather than by desk. The vocabulary lives here, in the one
 * package that carries no native image library, because three very different
 * callers have to agree on it:
 *
 *   - the server route that validates a request and forwards it,
 *   - the headless renderer that draws it,
 *   - the CMS component that offers "Regenerate Style".
 *
 * If those lists drift, an editor picks a layout the renderer does not have and
 * silently gets a different design — the exact failure this file prevents.
 */

/**
 * The two frames one design is published in.
 *
 * 16:9 is the web card, the YouTube thumbnail and the og:image. 4:5 is the
 * tallest portrait Facebook and Instagram give a feed post without cropping.
 * They are not two designs: the art director runs once, and the same headline,
 * palette and layout are recomposed for the second frame.
 */
export const POSTER_ASPECTS = ["16:9", "4:5"] as const;
export type PosterAspect = (typeof POSTER_ASPECTS)[number];

export function isPosterAspect(v: unknown): v is PosterAspect {
  return typeof v === "string" && (POSTER_ASPECTS as readonly string[]).includes(v);
}

/**
 * The five 16:9 shapes. Names are the brief's, including the underscores, so a
 * request, a DB row and a log line all use one spelling.
 */
export const POSTER_DESIGN_LAYOUTS = [
  "split_left_media",
  "split_right_media",
  "hero_overlay_gradient",
  "editorial_magazine_grid",
  "breaking_spotlight",
] as const;

export type PosterDesignLayout = (typeof POSTER_DESIGN_LAYOUTS)[number];

/** Human labels for the CMS and for the response payload. */
export const POSTER_DESIGN_LAYOUT_LABELS: Record<PosterDesignLayout, string> = {
  split_left_media: "Split left media",
  split_right_media: "Split right media",
  hero_overlay_gradient: "Hero overlay",
  editorial_magazine_grid: "Magazine grid",
  breaking_spotlight: "Breaking spotlight",
};

/** The five art directions the image model is briefed in. */
export const POSTER_VISUAL_STYLES = [
  "3D isometric render",
  "editorial digital illustration",
  "cinematic photojournalism",
  "minimalist vector art",
  "futuristic UI mockup",
] as const;

export type PosterVisualStyle = (typeof POSTER_VISUAL_STYLES)[number];

/**
 * A palette, as CSS variables the renderer injects.
 *
 * `textPrimary` is not always pure white: on warm gold and mint accents a
 * tinted off-white reads cleaner, and on the light-paper-inspired palettes the
 * ink is deliberately near-black. The renderer never guesses these.
 */
export type PosterPaletteId =
  | "tech_navy_cyan"
  | "finance_charcoal_gold"
  | "breaking_obsidian_crimson"
  | "health_forest_mint"
  | "world_indigo_coral";

export interface PosterPalette {
  id: PosterPaletteId;
  label: string;
  /** The story mood this palette answers to, shown in the CMS. */
  mood: string;
  bg: string;
  accent: string;
  /** The glass/panel surface that sits over background art. */
  cardBg: string;
  textPrimary: string;
  textMuted: string;
}

export const POSTER_PALETTES: readonly PosterPalette[] = [
  {
    id: "tech_navy_cyan",
    label: "Deep Navy + Cyan",
    mood: "Tech / Innovation",
    bg: "#0A1128",
    accent: "#00F5D4",
    cardBg: "rgba(10,17,40,0.78)",
    textPrimary: "#F4FEFF",
    textMuted: "rgba(244,254,255,0.72)",
  },
  {
    id: "finance_charcoal_gold",
    label: "Charcoal + Warm Gold",
    mood: "Finance / Business",
    bg: "#121619",
    accent: "#F59E0B",
    cardBg: "rgba(18,22,25,0.80)",
    textPrimary: "#FFF8EC",
    textMuted: "rgba(255,248,236,0.72)",
  },
  {
    id: "breaking_obsidian_crimson",
    label: "Obsidian + Crimson",
    mood: "Breaking / Urgent",
    bg: "#0F0F0F",
    accent: "#EF4444",
    cardBg: "rgba(15,15,15,0.82)",
    textPrimary: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.72)",
  },
  {
    id: "health_forest_mint",
    label: "Forest + Mint",
    mood: "Health / Environment",
    bg: "#0B1F17",
    accent: "#34D399",
    cardBg: "rgba(11,31,23,0.80)",
    textPrimary: "#F2FFF9",
    textMuted: "rgba(242,255,249,0.72)",
  },
  {
    id: "world_indigo_coral",
    label: "Midnight Indigo + Coral",
    mood: "Politics / World",
    bg: "#1E1B4B",
    accent: "#FB7185",
    cardBg: "rgba(30,27,75,0.78)",
    textPrimary: "#FFF5F7",
    textMuted: "rgba(255,245,247,0.72)",
  },
];

/** The procedural background textures. Kept small and code-drawn (SVG/CSS). */
export const POSTER_TEXTURES = [
  "dot_grid",
  "diagonal_mesh",
  "radial_glow",
  "topographic",
  "mixed",
] as const;

export type PosterTexture = (typeof POSTER_TEXTURES)[number];

export function isPosterDesignLayout(v: unknown): v is PosterDesignLayout {
  return typeof v === "string" && (POSTER_DESIGN_LAYOUTS as readonly string[]).includes(v);
}

export function isPosterPaletteId(v: unknown): v is PosterPaletteId {
  return typeof v === "string" && POSTER_PALETTES.some((p) => p.id === v);
}

export function isPosterVisualStyle(v: unknown): v is PosterVisualStyle {
  return typeof v === "string" && (POSTER_VISUAL_STYLES as readonly string[]).includes(v);
}

export function isPosterTexture(v: unknown): v is PosterTexture {
  return typeof v === "string" && (POSTER_TEXTURES as readonly string[]).includes(v);
}

export function paletteById(id: string | null | undefined): PosterPalette | null {
  if (!id) return null;
  return POSTER_PALETTES.find((p) => p.id === id) ?? null;
}

/** Every hex value this renderer publishes must be a plain `#rrggbb`. */
export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
}

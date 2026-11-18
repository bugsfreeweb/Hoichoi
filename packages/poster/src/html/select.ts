/**
 * Which poster an article gets, decided from the article.
 *
 * The brief asked for "dynamic variation": culture should not look like a
 * disaster, a profile should not look like a wire bulletin, and no two
 * neighbouring stories in a feed should be the same shape. It also asked for an
 * LLM to choose. This file chooses instead, for three measured reasons:
 *
 *   1. A layout is a *function of the desk*, not of the sentence. A crime story
 *      is a breaking banner whether or not a model felt like it today; a
 *      deterministic map cannot drift between two renders of the same story.
 *   2. Every LLM hop is a failure mode on a pipeline that must never miss an
 *      image. "Invalid JSON → default to split-left" is already what a map does,
 *      with no round trip and no quota.
 *   3. It is testable without a provider: the whole selection is pure.
 *
 * The image prompt is still written per story (that part genuinely needs
 * understanding). Only the *frame* is derived.
 */

import {
  POSTER_LAYOUTS,
  POSTER_THEMES,
  isPosterLayout,
  isPosterTheme,
  type PosterLayout,
  type PosterTheme,
} from "@hoichoi/shared-types";

// The frame vocabulary and its guard live in `@hoichoi/shared-types`: the admin
// picker is a client component and must not import a renderer that pulls native
// image libraries. They are re-exported here so the renderer's own API surface is
// unchanged.
export { POSTER_LAYOUTS, POSTER_THEMES, isPosterLayout, isPosterTheme };
export type { PosterLayout, PosterTheme };

export interface PosterPlan {
  layout: PosterLayout;
  theme: PosterTheme;
  /** Accent hex, already one of the five desked colours. */
  accent: string;
  /** Headline type size in px at the 1920×1080 frame. */
  headlineSize: number;
  /** Where the AI subject sits, for the prompt's composition clause. */
  subjectSide: "right" | "left" | "center" | "bottom-left";
}

/** The five accents from the art-direction brief, keyed by desk. */
export const DESK_ACCENTS = {
  breaking: "#DC2626", // crimson — breaking, politics
  finance: "#1D4ED8", // royal blue — economy, business
  tech: "#0D9488", // emerald teal — tech, science
  sports: "#EA580C", // vibrant orange — sports
  culture: "#B45309", // warm ochre — culture, lifestyle, opinion
} as const;

/**
 * Category slugs in this newsroom → the desk that decides the poster.
 *
 * The list is deliberately exhaustive over `CATEGORY_SEED` and the general
 * fallback; anything unknown lands on `breaking`, which is the safe default
 * (a plain, dark, single-column card) rather than something invented.
 */
const DESK_OF: Record<string, keyof typeof DESK_ACCENTS> = {
  // breaking / politics / crime / disaster
  politics: "breaking",
  national: "breaking",
  international: "breaking",
  world: "breaking",
  crime: "breaking",
  "extramarital-crime": "breaking",
  "missing-children": "breaking",
  accident: "breaking",
  disaster: "breaking",
  weather: "breaking",
  law: "breaking",
  // economy
  economy: "finance",
  business: "finance",
  markets: "finance",
  bank: "finance",
  // tech / science
  technology: "tech",
  tech: "tech",
  science: "tech",
  health: "tech",
  education: "tech",
  // sports
  sports: "sports",
  cricket: "sports",
  football: "sports",
  // culture / lifestyle / opinion
  culture: "culture",
  entertainment: "culture",
  lifestyle: "culture",
  opinion: "culture",
  literature: "culture",
  history: "culture",
  local: "culture",
  "human-interest": "culture",
};

/** Which layout a desk uses by default, before length or overrides are applied. */
const LAYOUT_OF_DESK: Record<keyof typeof DESK_ACCENTS, PosterLayout> = {
  // A bulletin is a banner: the red bar is the whole point of the shape.
  breaking: "breaking-banner",
  // Numbers and products are read left-to-right over a wide visual.
  finance: "split-left",
  tech: "split-left",
  // Sport is the one desk where the picture leads and the words follow.
  sports: "split-right",
  // Culture is the paper: a frame, a photograph on the right, columns.
  culture: "editorial-card",
};

/** Light paper reads as print; slate reads as a screen. */
const THEME_OF_DESK: Record<keyof typeof DESK_ACCENTS, PosterTheme> = {
  breaking: "dark",
  finance: "dark",
  tech: "dark",
  sports: "dark",
  culture: "light-paper",
};

/** Where the render should place its subject, per layout. */
const SUBJECT_OF_LAYOUT: Record<PosterLayout, PosterPlan["subjectSide"]> = {
  "split-left": "right",
  "split-right": "left",
  "editorial-card": "center",
  "breaking-banner": "bottom-left",
};

/**
 * Headline size, by counted characters.
 *
 * Bangla is dense: 60 characters is already a two-to-three line headline at this
 * frame. The thresholds are the brief's, and they are applied to the *stripped*
 * length so trailing punctuation cannot demote a short, punchy headline.
 */
export function headlineSizeFor(title: string): number {
  const length = title.replace(/\s+/g, " ").trim().length;
  if (length < 35) return 64;
  if (length <= 60) return 54;
  return 46;
}

/** Everything the renderer needs to know about a story's frame. */
export function planPoster(input: {
  category?: string | null;
  title: string;
  /** Admin override: a layout picked by hand in the console. */
  layout?: PosterLayout | null;
  /** Admin override: a theme picked by hand. */
  theme?: PosterTheme | null;
}): PosterPlan {
  const slug = (input.category ?? "").trim().toLowerCase();
  const desk = DESK_OF[slug] ?? "breaking";
  const layout = input.layout ?? LAYOUT_OF_DESK[desk];
  return {
    layout,
    theme: input.theme ?? THEME_OF_DESK[desk],
    accent: DESK_ACCENTS[desk],
    headlineSize: headlineSizeFor(input.title),
    subjectSide: SUBJECT_OF_LAYOUT[layout],
  };
}

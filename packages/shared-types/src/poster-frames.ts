/**
 * The poster's frame vocabulary.
 *
 * A layout and a theme are two words that the renderer, the API, the workflow and
 * the console all have to agree on. They live here — in the package every surface
 * already imports, and that carries no `sharp` or `playwright` — because the admin
 * picker is a client component: importing the lists from `@hoichoi/poster` would
 * pull a native image library into the browser bundle for two string arrays.
 *
 * `@hoichoi/poster` re-exports these, so a renderer author still finds them where
 * the rendering is.
 */

export type PosterLayout = "split-left" | "split-right" | "editorial-card" | "breaking-banner";
export type PosterTheme = "dark" | "light-paper";

export const POSTER_LAYOUTS = ["split-left", "split-right", "editorial-card", "breaking-banner"] as const;
export const POSTER_THEMES = ["dark", "light-paper"] as const;

export function isPosterLayout(v: unknown): v is PosterLayout {
  return typeof v === "string" && (POSTER_LAYOUTS as readonly string[]).includes(v);
}

export function isPosterTheme(v: unknown): v is PosterTheme {
  return typeof v === "string" && (POSTER_THEMES as readonly string[]).includes(v);
}

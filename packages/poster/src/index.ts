export {
  BRAND_MARK,
  POSTER_FRAME,
  backdropSvg,
  captionSvg,
  creditLine,
  ensurePosterFonts,
  escapeXml,
  fitCaption,
  fontsDir,
  kickerLine,
  renderPoster,
  topicCues,
  wrapCaption,
  POSTER_FONT_FAMILY,
} from "./render";
export type { PosterSpec, RenderedPoster, RenderPosterOptions } from "./render";

// The editorial poster: HTML/CSS drawn by a browser engine, because Bengali
// conjuncts need HarfBuzz shaping that librsvg does not give us.
export {
  renderEditorialPoster,
  closePosterBrowser,
  PosterBrowserUnavailable,
  type EditorialPosterOptions,
  type EditorialPosterResult,
} from "./html/render";
export { posterHtml, escapeHtml, barcodeBars, POSTER_HTML_FRAME, type PosterContent } from "./html/template";
export { dataUrlForImage, sniffMime } from "./html/image";
export {
  planPoster,
  headlineSizeFor,
  DESK_ACCENTS,
  POSTER_LAYOUTS,
  POSTER_THEMES,
  isPosterLayout,
  isPosterTheme,
  type PosterLayout,
  type PosterTheme,
  type PosterPlan,
} from "./html/select";

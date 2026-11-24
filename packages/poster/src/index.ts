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
// The broadcast card: the 1200×675 social frame, rendered at 2× (2400×1350).
export {
  BROADCAST_FRAME,
  BROADCAST_SCALE,
  broadcastCardTemplate,
  broadcastVariant,
  headlineSizeForCard,
  renderBroadcastCard,
  type BroadcastCardInput,
  type BroadcastCardResult,
  type BroadcastVariant,
} from "./html/broadcast";
export { renderHtmlToPng } from "./html/render";
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

// The dynamic poster: five story-driven layouts, five palettes, art-directed.
export {
  renderDesignPoster,
  designContent,
  loadDesignAssets,
  type DesignPlan,
  type DesignPosterOptions,
  type DesignPosterResult,
} from "./design/render";
export { designPosterHtml } from "./design/compose";
export {
  DESIGN_FRAME,
  DESIGN_SCALE,
  focalAspectFor,
  headlineSizeFor as designHeadlineSizeFor,
  paletteVars,
  resolvePalette,
  type DesignPosterContent,
} from "./design/tokens";
export { textureSvg, textureDataUri } from "./design/textures";

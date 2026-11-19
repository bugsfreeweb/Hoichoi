/**
 * The story plate, as the collector sees it.
 *
 * `@hoichoi/poster` knows how to draw a plate; this file knows what to write on
 * it. Three rules are encoded here rather than at every call site:
 *
 *   1. A story never ships without a picture. If the model returned bytes we
 *      caption those; if it did not, we still draw the branded plate for the
 *      headline. "The provider was rate-limited" is not a reason to publish a
 *      card with no image.
 *   2. The desk and the date are in Bangla, because the picture is read by the
 *      same people as the headline.
 *   3. The typography is drawn by a browser engine, not by SVG text. librsvg
 *      mis-shapes Bengali conjuncts (verified against Chromium on the same
 *      sentence), and a poster with broken যুক্তবর্ণ is worse than no poster —
 *      so `renderEditorialPoster` is the primary path and the old SVG plate is
 *      only the emergency net for a runtime with no Chromium at hand.
 */
import { banglaDate, deskFor } from "@hoichoi/db";
import {
  PosterBrowserUnavailable,
  renderBroadcastCard,
  renderEditorialPoster,
  renderPoster,
  topicCues,
  type PosterSpec,
  type EditorialPosterResult,
  type PosterLayout,
  type PosterTheme,
} from "@hoichoi/poster";

/** Re-exported from the database package so the collector and the web route agree. */
export { banglaDate, deskFor } from "@hoichoi/db";

export interface PlateInput {
  /** The model's render, or null when there is none. */
  background: Buffer | null;
  title: string;
  /** The standfirst, printed under the headline when there is one. */
  summary?: string | null;
  category?: string | null;
  source?: string | null;
  date?: Date;
  /** Stable seed for the fallback backdrop. Defaults to the headline. */
  seed?: string;
  /** Admin overrides from the console. */
  layout?: PosterLayout | null;
  theme?: PosterTheme | null;
}

/** What the caller may want to know beyond the bytes. */
export interface PlateOutput {
  bytes: Buffer;
  /** True when the picture is our branded backdrop rather than a render. */
  usedFallbackBackdrop: boolean;
  /** The engine that drew it — "html" when a browser was available. */
  engine: "html" | "svg";
  /** The layout the story was given, when the browser drew it. */
  layout?: PosterLayout;
  theme?: PosterTheme;
}

/**
 * Re-encode the card PNG as WebP.
 *
 * The plate's contract with every caller is "WebP bytes at 16:9", because the
 * media pipeline names the file by the plate's own format and the mirror assumes
 * `img_*.webp`. The card is drawn as PNG (that is what a social card is), so the
 * conversion happens here rather than in four call sites.
 */
async function toWebp(png: Buffer): Promise<Buffer> {
  type SharpFn = (input: Buffer) => import("sharp").Sharp;
  const mod: unknown = await import("sharp");
  const sharp =
    typeof mod === "function" ? (mod as SharpFn) : (mod as { default?: SharpFn }).default;
  if (!sharp) throw new Error("sharp module exposes no callable export");
  return sharp(png).webp({ quality: 90 }).toBuffer();
}

/** Compose the finished 1920×1080 poster, never throwing for a missing background. */
export async function composeStoryPlateDetailed(
  input: PlateInput,
): Promise<PlateOutput> {
  const desk = deskFor(input.category);
  const dateText = banglaDate(input.date ?? new Date());

  /**
   * A story plate is a **broadcast card** unless a desk asked for one of the
   * archive frames.
   *
   * The four editorial layouts (banner, split, paper, card) were the newsroom's
   * answer to "a poster", and they read as a page rather than as a card: dark,
   * long, and shaped like an article. A story's picture is met in a feed, so the
   * default is now the 1200×675 broadcast frame at 2× — navy-to-crimson field,
   * red desk badge, white-to-gold headline, translucent standfirst box and a
   * solid white footer bar. The layouts are still reachable by passing `layout`
   * or `theme`, which is what the console's override picker does.
   */
  if (!input.layout && !input.theme) {
    try {
      const card = await renderBroadcastCard({
        category: input.category ? desk.label : null,
        title: input.title,
        summary: input.summary ?? null,
        source: input.source ?? null,
        dateText,
        accent: desk.accent,
        // The story's own picture inspires the field — blurred, saturation-lifted
        // and soft-light blended — instead of being pasted onto it.
        backgroundImage: input.background,
      });
      return {
        bytes: await toWebp(card.bytes),
        usedFallbackBackdrop: !input.background,
        engine: "html",
      };
    } catch (err) {
      // No browser, no fonts: fall through to the archive renderer, which has its
      // own SVG net. A story never ships without a picture.
      if (!(err instanceof PosterBrowserUnavailable)) throw err;
    }
  }

  try {
    const rendered: EditorialPosterResult = await renderEditorialPoster({
      background: input.background,
      title: input.title,
      summary: input.summary ?? null,
      // The slug picks the frame; the label is what the reader sees. Passing the
      // label into the slug slot made every plate the same dark breaking banner.
      category: input.category ?? null,
      deskLabel: input.category ? desk.label : null,
      source: input.source ?? null,
      dateText,
      seed: input.seed ?? input.title,
      accent: desk.accent,
      layout: input.layout ?? null,
      theme: input.theme ?? null,
      format: "webp",
    });
    return {
      bytes: rendered.bytes,
      usedFallbackBackdrop: rendered.usedFallbackBackdrop,
      engine: "html",
      layout: rendered.layout,
      theme: rendered.theme,
    };
  } catch (err) {
    // No browser (a serverless function, a runner without Chromium): keep the
    // promise that a story has a picture, and say which engine drew it.
    console.warn(
      `[plate] browser renderer unavailable, falling back to the SVG plate: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const spec: PosterSpec = {
    title: input.title,
    category: desk.label,
    source: input.source ?? null,
    dateText,
    topics: topicCues({ category: desk.label, title: input.title }),
  };
  const rendered = await renderPoster({
    background: input.background,
    spec,
    seed: input.seed ?? input.title,
    accent: desk.accent,
  });
  return {
    bytes: rendered.bytes,
    usedFallbackBackdrop: rendered.usedFallbackBackdrop,
    engine: "svg",
  };
}

/** Backwards-compatible bytes-only helper. */
export async function composeStoryPlate(input: PlateInput): Promise<Buffer> {
  return (await composeStoryPlateDetailed(input)).bytes;
}

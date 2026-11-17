import { ensurePosterFonts } from "./fonts";
import {
  POSTER_FRAME,
  backdropSvg,
  captionSvg,
  type PosterSpec,
} from "./layout";

export interface RenderPosterOptions {
  /**
   * The AI render, or `null` when there is none.
   *
   * `null` is a normal input, not an error: the caller publishes either way, and
   * the plate falls back to the story's own branded backdrop.
   */
  background: Buffer | null;
  spec: PosterSpec;
  /** Seed for the fallback backdrop. Defaults to the headline. */
  seed?: string;
  /** Encoded output. WebP keeps a 1600×900 photographic plate under ~200 KB. */
  format?: "webp" | "jpeg" | "png";
  quality?: number;
  /** Accent colour for the fallback backdrop, so a sports plate is not the news red. */
  accent?: string;
}

export interface RenderedPoster {
  bytes: Buffer;
  contentType: string;
  width: number;
  height: number;
  /** True when no AI render was available and the branded backdrop was used. */
  usedFallbackBackdrop: boolean;
}

const MIME: Record<string, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * Compose the story plate: landscape frame, brand lockup, caption, credit.
 *
 * The background is cover-cropped to 16:9 rather than letterboxed — a strip of
 * empty bars is what a portrait render looks like when it is forced into a card,
 * and the composition is already "subject on one side, space on the other", so a
 * centre crop keeps the subject.
 */
export async function renderPoster(opts: RenderPosterOptions): Promise<RenderedPoster> {
  ensurePosterFonts();
  const sharp = (await import("sharp")).default;
  const { width, height } = POSTER_FRAME;
  const format = opts.format ?? "webp";

  const plate = opts.background
    ? await sharp(opts.background)
        .rotate()
        .resize({ width, height, fit: "cover", position: "attention" })
        .toBuffer()
    : await sharp(Buffer.from(backdropSvg(opts.seed ?? opts.spec.title, opts.accent)))
        .resize({ width, height, fit: "cover" })
        .toBuffer();

  const pipeline = sharp(plate).composite([{ input: Buffer.from(captionSvg(opts.spec)), top: 0, left: 0 }]);

  const bytes =
    format === "jpeg"
      ? await pipeline.jpeg({ quality: opts.quality ?? 86, mozjpeg: true }).toBuffer()
      : format === "png"
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.webp({ quality: opts.quality ?? 84 }).toBuffer();

  return {
    bytes,
    contentType: MIME[format] ?? "image/webp",
    width,
    height,
    usedFallbackBackdrop: !opts.background,
  };
}

export { POSTER_FRAME, captionSvg, backdropSvg, fitCaption, wrapCaption, escapeXml, kickerLine, creditLine } from "./layout";
export type { PosterSpec } from "./layout";
export { ensurePosterFonts, fontsDir, POSTER_FONT_FAMILY } from "./fonts";

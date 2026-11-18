import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePosterFonts } from "./fonts";
import {
  BRAND_MARK,
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

type SharpFactory = (input: Buffer) => import("sharp").Sharp;

/**
 * sharp as a callable, on any version of its typings.
 *
 * sharp 0.35 changed its declarations so `typeof import("sharp")` no longer
 * carries a call signature; asking for the shape this file needs keeps the same
 * code compiling on both sides of that change.
 */
async function loadSharp(): Promise<SharpFactory> {
  const mod: unknown = await import("sharp");
  const factory =
    typeof mod === "function" ? (mod as SharpFactory) : (mod as { default?: SharpFactory }).default;
  if (!factory) throw new Error("sharp module exposes no callable export");
  return factory;
}

let markCache: Buffer | null | undefined;

/**
 * The logo mark, resized once per process.
 *
 * A missing asset must not fail a render — the plate is still branded by the
 * wordmark beside it — so every failure returns `null` and the caption is drawn
 * exactly where it was before the mark existed.
 */
async function brandMark(sharp: SharpFactory): Promise<Buffer | null> {
  if (markCache !== undefined) return markCache ?? null;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // `src/` in the repo, `dist/` after a build, and the package root under the
    // bundlers — all three resolve to `assets/logo.png` from one of these.
    const candidates = [
      join(here, "..", "assets", "logo.png"),
      join(here, "assets", "logo.png"),
      join(process.cwd(), "packages", "poster", "assets", "logo.png"),
    ];
    for (const path of candidates) {
      try {
        const bytes = await readFile(path);
        markCache = await sharp(bytes)
          .resize({ width: BRAND_MARK.size, height: BRAND_MARK.size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        return markCache ?? null;
      } catch {
        continue;
      }
    }
    markCache = null;
  } catch {
    markCache = null;
  }
  return markCache ?? null;
}

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
  const sharp = await loadSharp();
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

  // The mark is a raster layer, not part of the SVG: librsvg would have to load
  // the PNG through a file: href, which does not resolve once the package is
  // bundled into a lambda or the desktop runner.
  const mark = await brandMark(sharp);
  const layers: Array<{ input: Buffer; top: number; left: number }> = [
    { input: Buffer.from(captionSvg(opts.spec)), top: 0, left: 0 },
  ];
  if (mark) layers.push({ input: mark, top: 64, left: 88 });

  const pipeline = sharp(plate).composite(layers);

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

export {
  BRAND_MARK,
  POSTER_FRAME,
  captionSvg,
  backdropSvg,
  fitCaption,
  topicCues,
  wrapCaption,
  escapeXml,
  kickerLine,
  creditLine,
} from "./layout";
export type { PosterSpec } from "./layout";
export { ensurePosterFonts, fontsDir, POSTER_FONT_FAMILY } from "./fonts";

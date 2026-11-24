/**
 * Render the dynamic poster through Chromium.
 *
 * The browser is not incidental here, it is the whole guarantee: Bengali
 * conjuncts are shaped by HarfBuzz inside the page, so the typography is exact
 * even though an image model produced the visual. Rendering at
 * `deviceScaleFactor: 2` gives a 3840×2160 file from the 1920×1080 frame — the
 * size a newspaper needs for print, web and a video thumbnail from one asset.
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  PosterDesignLayout,
  PosterPaletteId,
  PosterTexture,
  PosterVisualStyle,
} from "@hoichoi/shared-types";
import { paletteById } from "@hoichoi/shared-types";
import { dataUrlForImage } from "../html/image";
import { renderHtmlToPng } from "../html/render";
import { designPosterHtml } from "./compose";
import {
  DESIGN_FRAME,
  DESIGN_SCALE,
  type DesignFontFace,
  type DesignPosterContent,
  resolvePalette,
} from "./tokens";

/** The subset of the art director's plan this package can draw. */
export interface DesignPlan {
  headline: string;
  highlightWord: string;
  bullets: string[];
  pullQuote: string | null;
  badgeText: string;
  footerText: string;
  layout: PosterDesignLayout;
  paletteId: PosterPaletteId;
  visualStyle: PosterVisualStyle;
  texture: PosterTexture;
  imagePrompt: string;
}

export interface DesignPosterOptions {
  plan: DesignPlan;
  /** The focal visual, or null for the textured branded wash. */
  background: Buffer | null;
  /** Hex overrides for the chosen palette (the CMS may pass a custom accent). */
  accent?: string | null;
  bg?: string | null;
  brand?: string;
  site?: string;
  dateText?: string | null;
  seed?: string;
  format?: "png" | "webp";
  quality?: number;
}

export interface DesignPosterResult {
  bytes: Buffer;
  contentType: string;
  width: number;
  height: number;
  layout: PosterDesignLayout;
  paletteId: PosterPaletteId;
  visualStyle: PosterVisualStyle;
  texture: PosterTexture;
  /** True when there is no AI image behind the type. */
  usedFallbackVisual: boolean;
}

const FACE_FILES: Array<{ family: string; weight: number; file: string }> = [
  { family: "Hind Siliguri", weight: 400, file: "HindSiliguri-Regular.ttf" },
  { family: "Hind Siliguri", weight: 500, file: "HindSiliguri-Medium.ttf" },
  { family: "Hind Siliguri", weight: 600, file: "HindSiliguri-SemiBold.ttf" },
  { family: "Hind Siliguri", weight: 700, file: "HindSiliguri-Bold.ttf" },
  { family: "Galada", weight: 400, file: "Galada-Regular.ttf" },
  { family: "Noto Serif Bengali", weight: 700, file: "NotoSerifBengali-Bold.ttf" },
  { family: "Noto Sans Bengali", weight: 400, file: "NotoSansBengali-Regular.ttf" },
  { family: "Noto Sans Bengali", weight: 700, file: "NotoSansBengali-Bold.ttf" },
];

let assets:
  | Promise<{ fonts: DesignFontFace[]; logo: string | null }>
  | null = null;

/** Fonts and logo, read once, inlined as data URLs. */
export async function loadDesignAssets(): Promise<{
  fonts: DesignFontFace[];
  logo: string | null;
}> {
  if (assets) return assets;
  assets = (async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const roots = [
      resolve(here, "..", "..", "fonts"),
      resolve(process.cwd(), "packages", "poster", "fonts"),
    ];
    const fonts: DesignFontFace[] = [];
    for (const face of FACE_FILES) {
      for (const root of roots) {
        try {
          const bytes = await readFile(join(root, face.file));
          fonts.push({
            family: face.family,
            weight: face.weight,
            dataUrl: `data:font/ttf;base64,${bytes.toString("base64")}`,
          });
          break;
        } catch {
          continue;
        }
      }
    }
    if (fonts.length === 0) throw new Error("poster fonts are missing from the package");
    let logo: string | null = null;
    for (const root of [
      resolve(here, "..", "..", "assets"),
      resolve(process.cwd(), "packages", "poster", "assets"),
    ]) {
      try {
        const bytes = await readFile(join(root, "logo.png"));
        logo = `data:image/png;base64,${bytes.toString("base64")}`;
        break;
      } catch {
        continue;
      }
    }
    return { fonts, logo };
  })();
  return assets;
}

/** Build the content object from a plan and the caller's brand options. */
export async function designContent(
  opts: DesignPosterOptions,
): Promise<DesignPosterContent> {
  const { fonts, logo } = await loadDesignAssets();
  const base = resolvePalette(opts.plan.paletteId);
  const palette =
    opts.accent || opts.bg
      ? {
          ...base,
          bg: opts.bg ?? base.bg,
          accent: opts.accent ?? base.accent,
        }
      : base;
  return {
    headline: opts.plan.headline,
    highlightWord: opts.plan.highlightWord,
    bullets: opts.plan.bullets.slice(0, 3),
    pullQuote: opts.plan.pullQuote,
    badgeText: opts.plan.badgeText,
    footerText: opts.plan.footerText,
    layout: opts.plan.layout,
    palette,
    visualStyle: opts.plan.visualStyle,
    texture: opts.plan.texture,
    backgroundDataUrl: opts.background ? dataUrlForImage(opts.background) : null,
    logoDataUrl: logo,
    fonts,
    brand: opts.brand?.trim() || "হৈচৈ",
    site: opts.site?.trim() || "hoichoifeed.vercel.app",
    dateText: opts.dateText ?? null,
    seed: opts.seed?.trim() || opts.plan.headline,
  } as DesignPosterContent;
}

/** Draw the poster and encode it. Throws when Chromium is unavailable. */
export async function renderDesignPoster(
  opts: DesignPosterOptions,
): Promise<DesignPosterResult> {
  const content = await designContent(opts);
  const png = await renderHtmlToPng(designPosterHtml(content), {
    width: DESIGN_FRAME.width,
    height: DESIGN_FRAME.height,
    scale: DESIGN_SCALE,
  });

  const width = DESIGN_FRAME.width * DESIGN_SCALE;
  const height = DESIGN_FRAME.height * DESIGN_SCALE;
  const format = opts.format ?? "png";

  if (format === "png") {
    return {
      bytes: png,
      contentType: "image/png",
      width,
      height,
      layout: content.layout,
      paletteId: content.palette.id,
      visualStyle: content.visualStyle,
      texture: content.texture,
      usedFallbackVisual: !opts.background,
    };
  }

  type SharpFn = (input: Buffer) => import("sharp").Sharp;
  const mod: unknown = await import("sharp");
  const sharp =
    typeof mod === "function" ? (mod as SharpFn) : (mod as { default?: SharpFn }).default;
  if (!sharp) throw new Error("sharp module exposes no callable export");
  const bytes = await sharp(png).webp({ quality: opts.quality ?? 90 }).toBuffer();
  return {
    bytes,
    contentType: "image/webp",
    width,
    height,
    layout: content.layout,
    paletteId: content.palette.id,
    visualStyle: content.visualStyle,
    texture: content.texture,
    usedFallbackVisual: !opts.background,
  };
}

export { paletteById };

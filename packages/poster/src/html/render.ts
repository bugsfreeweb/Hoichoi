/**
 * HTML → PNG, through a real browser engine.
 *
 * This is the only part of the poster that needs a browser, and it is deliberately
 * the smallest part: one long-lived Chromium, one page, one screenshot. The
 * browser is launched lazily so a runtime that has no Chromium (a serverless
 * function, a CI job without the browser cache) does not fail at import time —
 * `renderEditorialPoster` reports that it is unavailable and the caller keeps its
 * old renderer instead of the pipeline dying.
 *
 * Two solves here were measured rather than guessed:
 *
 *   - `document.fonts.ready` must be awaited. Base64 `@font-face` sources still
 *     load asynchronously, and a screenshot taken before they settle renders the
 *     Bengali headline in the fallback face — which is exactly the "broken font"
 *     look this whole path exists to remove.
 *   - the viewport is the poster frame, not a window. Chromium clamps layout to
 *     the viewport for `100vh`/`inset` positioning, so a 1280×800 default page
 *     silently crops a 1920×1080 poster.
 */
import { readFile } from "node:fs/promises";
// Static on purpose: Next's server bundle cannot resolve a dynamically named
// package from the lambda directory, even when it is a real dependency. The
// module is small; only the browser binary is optional, and a launch failure is
// already handled as PosterBrowserUnavailable.
import { chromium as bundledChromium } from "playwright-core";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { POSTER_HTML_FRAME, posterHtml, type PosterContent } from "./template";
import { dataUrlForImage } from "./image";
import {
  planPoster,
  type PosterLayout,
  type PosterPlan,
  type PosterTheme,
} from "./select";

export interface EditorialPosterOptions {
  /** The AI render, or null for the branded wash. */
  background: Buffer | null;
  title: string;
  summary?: string | null;
  /**
   * The category **slug** (`culture`, `national`, …) — the frame is chosen from
   * this, so it must be the machine name and not a display label.
   */
  category?: string | null;
  /**
   * The desk as a reader sees it ("সংস্কৃতি"). Printed on the plate.
   *
   * These were one field, and the platter passed the Bangla label into the
   * slug slot — so `planPoster` matched nothing, every story landed on the
   * `breaking` desk, and every poster came out as the same dark breaking
   * banner no matter what it was about.
   */
  deskLabel?: string | null;
  dateText?: string | null;
  source?: string | null;
  site?: string | null;
  brand?: string | null;
  seed?: string;
  accent?: string | null;
  /** Admin overrides. */
  layout?: PosterLayout | null;
  theme?: PosterTheme | null;
  /** Encoded output. The plate is photographic, so WebP keeps it under ~300 KB. */
  format?: "webp" | "png" | "jpeg";
  quality?: number;
}

export interface EditorialPosterResult {
  bytes: Buffer;
  contentType: string;
  width: number;
  height: number;
  layout: PosterLayout;
  theme: PosterTheme;
  plan: PosterPlan;
  usedFallbackBackdrop: boolean;
}

/** Thrown when this runtime has no browser; callers fall back rather than fail. */
export class PosterBrowserUnavailable extends Error {
  constructor(cause?: unknown) {
    super(
      `poster browser unavailable: ${cause instanceof Error ? cause.message : String(cause ?? "chromium not found")}`,
    );
    this.name = "PosterBrowserUnavailable";
  }
}

const MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg",
};

let assets: Promise<{
  fonts: PosterContent["fonts"];
  logo: string | null;
}> | null = null;

/** Fonts and the logo, read once and inlined as data URLs. */
export function loadAssets(): Promise<{
  fonts: PosterContent["fonts"];
  logo: string | null;
}> {
  if (assets) return assets;
  assets = (async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const roots = [
      resolve(here, "..", "..", "fonts"),
      resolve(process.cwd(), "packages", "poster", "fonts"),
      // Vercel runs the function with cwd at the repository root or at
      // /var/task/apps/web depending on how the monorepo was traced.
      resolve(process.cwd(), "..", "..", "packages", "poster", "fonts"),
      resolve(process.cwd(), "..", "packages", "poster", "fonts"),
      "/var/task/packages/poster/fonts",
      "/var/task/apps/web/packages/poster/fonts",
    ];
    const faces: Array<{ family: string; weight: number; file: string }> = [
      {
        family: "Noto Serif Bengali",
        weight: 700,
        file: "NotoSerifBengali-Bold.ttf",
      },
      {
        family: "Noto Serif Bengali",
        weight: 600,
        file: "NotoSerifBengali-SemiBold.ttf",
      },
      {
        family: "Noto Sans Bengali",
        weight: 400,
        file: "NotoSansBengali-Regular.ttf",
      },
      {
        family: "Noto Sans Bengali",
        weight: 700,
        file: "NotoSansBengali-Bold.ttf",
      },
    ];
    const fonts: PosterContent["fonts"] = [];
    for (const face of faces) {
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
    if (fonts.length === 0)
      throw new PosterBrowserUnavailable(
        "poster fonts are missing from the package",
      );
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

type BrowserHandle = {
  // The Playwright types are intentionally not imported: this module must load
  // (and be type-checked) in packages that never install a browser.
  newPage: (opts: {
    viewport: { width: number; height: number };
    deviceScaleFactor: number;
  }) => Promise<{
    setContent: (html: string, opts: { waitUntil: "load" }) => Promise<void>;
    evaluate: <T>(fn: () => Promise<T>) => Promise<T>;
    screenshot: (opts: { type: "png" }) => Promise<Buffer>;
    close: () => Promise<void>;
  }>;
  close: () => Promise<void>;
};

/**
 * Launch, use, close. Every single render.
 *
 * A reused browser is faster, but it also keeps a live child process attached to
 * the event loop, so a CLI run that rendered four posters would print four lines
 * and then hang until CI's timeout. Measured cost of a cold launch is a few
 * hundred milliseconds against a render that already takes seconds; a hung
 * pipeline is not worth that trade.
 */
async function withBrowser<T>(
  fn: (browser: BrowserHandle) => Promise<T>,
): Promise<T> {
  let launched: BrowserHandle | null = null;
  let lastError: unknown = null;
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  let executablePath: string | undefined;
  let args = ["--no-sandbox", "--disable-dev-shm-usage"];
  if (serverless) {
    // A Vercel function has no system browser. @sparticuz/chromium ships a
    // headless build and unpacks it into /tmp; without this the route can only
    // ever report "no Chromium" in production.
    try {
      const mod = (await import("@sparticuz/chromium")) as unknown as {
        default?: { executablePath: () => Promise<string>; args: string[] };
        executablePath?: () => Promise<string>;
        args?: string[];
      };
      const pack = mod.default ?? mod;
      executablePath = await pack.executablePath!();
      args = [...(pack.args ?? []), ...args];
    } catch (err) {
      lastError = err;
    }
  }
  try {
    launched = await (bundledChromium as unknown as {
      launch: (opts?: Record<string, unknown>) => Promise<BrowserHandle>;
    }).launch({
      args,
      ...(executablePath ? { executablePath } : {}),
    });
  } catch (err) {
    lastError = err;
  }
  for (const name of launched ? [] : ["playwright", "playwright-core"]) {
    try {
      // A dynamic, non-literal specifier: this module must import cleanly in a
      // runtime that has no browser package installed at all.
      const mod = (await import(name)) as unknown as {
        chromium?: {
          launch: (opts?: Record<string, unknown>) => Promise<BrowserHandle>;
        };
      };
      if (!mod.chromium) continue;
      launched = await mod.chromium.launch({
        args,
        ...(executablePath ? { executablePath } : {}),
      });
      break;
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  if (!launched)
    throw new PosterBrowserUnavailable(
      lastError ?? "no chromium available to launch",
    );
  try {
    return await fn(launched);
  } finally {
    await launched.close().catch(() => undefined);
  }
}

/**
 * Draw an HTML page and screenshot it as a PNG.
 *
 * Exported so a second template (the broadcast card) can share the one browser
 * launcher, the one font-ready wait and the one "close the browser" rule instead
 * of copying them. `scale` is the device scale factor: a 1200×675 card at 2× is
 * a 2400×1350 PNG, which is the size a social platform downsamples from.
 */
export async function renderHtmlToPng(
  html: string,
  opts: { width: number; height: number; scale?: number },
): Promise<Buffer> {
  const scale = opts.scale ?? 1;
  return withBrowser(async (browser) => {
    const page = await browser.newPage({
      viewport: { width: opts.width, height: opts.height },
      deviceScaleFactor: scale,
    });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      // Base64 faces still decode asynchronously; without this the screenshot can
      // beat the font and the headline lands in a fallback face.
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    return page.screenshot({ type: "png" });
  });
}

/**
 * Render the editorial poster.
 *
 * Throws {@link PosterBrowserUnavailable} when there is no browser — the caller
 * is expected to keep a renderer for that case, because "no picture" is never an
 * acceptable outcome.
 */
export async function renderEditorialPoster(
  opts: EditorialPosterOptions,
): Promise<EditorialPosterResult> {
  const plan = planPoster({
    category: opts.category,
    title: opts.title,
    layout: opts.layout,
    theme: opts.theme,
  });
  const withAccent: PosterPlan = opts.accent
    ? { ...plan, accent: opts.accent }
    : plan;
  const { fonts, logo } = await loadAssets();

  const content: PosterContent = {
    title: opts.title,
    summary: opts.summary ?? null,
    category: opts.deskLabel ?? opts.category ?? null,
    dateText: opts.dateText ?? null,
    source: opts.source ?? null,
    brand: opts.brand ?? "হৈচৈ",
    site: opts.site ?? "hoichoifeed.vercel.app",
    seed: opts.seed ?? opts.title,
    backgroundDataUrl: opts.background
      ? dataUrlForImage(opts.background)
      : null,
    logoDataUrl: logo,
    fonts,
    kicker: withAccent.layout === "breaking-banner" ? "ব্রেকিং নিউজ" : null,
  };

  const png = await withBrowser(async (chromium) => {
    const page = await chromium.newPage({
      viewport: {
        width: POSTER_HTML_FRAME.width,
        height: POSTER_HTML_FRAME.height,
      },
      deviceScaleFactor: 1,
    });
    await page.setContent(posterHtml(content, withAccent), {
      waitUntil: "load",
    });
    await page.evaluate(async () => {
      // Base64 faces still decode asynchronously; without this the screenshot can
      // beat the font and the headline lands in a fallback face.
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    return page.screenshot({ type: "png" });
  });

  {
    // Callable on either set of sharp typings: 0.33 and 0.35 disagree on whether
    // the module type itself carries a call signature.
    type SharpFn = (input: Buffer) => import("sharp").Sharp;
    const mod: unknown = await import("sharp");
    const sharp =
      typeof mod === "function"
        ? (mod as SharpFn)
        : (mod as { default?: SharpFn }).default;
    if (!sharp) throw new Error("sharp module exposes no callable export");
    const format = opts.format ?? "webp";
    const pipeline = sharp(png).resize({
      width: POSTER_HTML_FRAME.width,
      height: POSTER_HTML_FRAME.height,
    });
    const bytes =
      format === "png"
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : format === "jpeg"
          ? await pipeline
              .jpeg({ quality: opts.quality ?? 88, mozjpeg: true })
              .toBuffer()
          : await pipeline.webp({ quality: opts.quality ?? 86 }).toBuffer();

    return {
      bytes,
      contentType: MIME[format] ?? "image/webp",
      width: POSTER_HTML_FRAME.width,
      height: POSTER_HTML_FRAME.height,
      layout: withAccent.layout,
      theme: withAccent.theme,
      plan: withAccent,
      usedFallbackBackdrop: !opts.background,
    };
  }
}

/**
 * Nothing to close: each render owns its browser and closes it.
 *
 * Kept as an exported no-op so callers that used to shut a shared browser down at
 * the end of a run still compile, and so the contract ("a render leaves no
 * process behind") is documented in one place.
 */
export async function closePosterBrowser(): Promise<void> {
  return;
}

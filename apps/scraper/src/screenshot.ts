import type { RawPost } from "@hoichoi/shared-types";
import { launchChromium } from "./browser";

export interface ScreenshotOptions {
  url: string;
  outPath: string;
  width?: number;
  log?: (msg: string) => void;
}

/**
 * Full-page screenshot of a Facebook post for visual moderation evidence.
 * `deviceScaleFactor: 2` keeps text crisp; saved to media storage, never
 * served publicly (admin-only routes).
 */
export async function captureScreenshot(
  opts: ScreenshotOptions,
): Promise<string | null> {
  try {
    await import("playwright");
  } catch {
    opts.log?.(`[screenshot] playwright not installed — skipping ${opts.url}`);
    return null;
  }
  const browser = await launchChromium();
  try {
    const ctx = await browser.newContext({
      viewport: { width: opts.width ?? 1280, height: 1400 },
      deviceScaleFactor: 2,
      locale: "bn-BD",
    });
    const page = await ctx.newPage();
    await page.goto(opts.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1_500);
    await page.screenshot({
      path: opts.outPath,
      fullPage: true,
      type: "png",
    });
    opts.log?.(`[screenshot] saved ${opts.outPath}`);
    return opts.outPath;
  } catch (err) {
    opts.log?.(`[screenshot] failed ${opts.url}: ${(err as Error).message}`);
    return null;
  } finally {
    await browser.close();
  }
}

/** Screenshot the raw Facebook post for a RawPost that lacks one. */
export async function screenshotRawPost(
  raw: RawPost,
  outPath: string,
  log?: (msg: string) => void,
): Promise<string | null> {
  return captureScreenshot({ url: raw.fb_post_url, outPath, log });
}
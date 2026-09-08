import type { Browser } from "playwright";

/**
 * Launch a headless Chromium browser for scraping.
 *
 * The desktop runtime sets HOICHOI_USE_SYSTEM_BROWSER=1 to launch the
 * Chromium engine of the system-installed Microsoft Edge instead of a
 * downloaded Playwright bundle, keeping the installer self-contained.
 */
export async function launchChromium(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({
    headless: true,
    channel: process.env.HOICHOI_USE_SYSTEM_BROWSER === "1" ? "msedge" : undefined,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
}
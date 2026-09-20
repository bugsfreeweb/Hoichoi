import * as fs from "node:fs";
import type { Browser, LaunchOptions } from "playwright";

interface LaunchAttempt {
  label: string;
  opts: LaunchOptions;
}

/** Detect locally-installed system browsers (Windows standard locations). */
function systemChannels(): string[] {
  const candidates: Array<[string, string[]]> = [
    ["chrome", ["C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      ...(process.env.LOCALAPPDATA ? [`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`] : [])]],
    ["msedge", ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Microsoft/Edge/Application/msedge.exe"]],
  ];
  const found: string[] = [];
  for (const [vendor, exes] of candidates) {
    if (exes.some((p) => fs.existsSync(p))) found.push(vendor);
  }
  return found;
}

/**
 * Launch a headless Chromium browser for scraping, falling back across
 * candidate engines so a missing Playwright browser download never kills the
 * whole collector:
 *
 *   1. A system Microsoft Edge / Google Chrome installation (self-contained
 *      desktop runtime), ordered by the HOICHOI_USE_SYSTEM_BROWSER flag.
 *   2. Playwright's bundled chromium (used on CI after `playwright install`).
 *
 * The desktop runtime sets HOICHOI_USE_SYSTEM_BROWSER=1 to launch the Chromium
 * engine of the system browser instead of a downloaded Playwright bundle,
 * keeping the installer self-contained.
 */
export async function launchChromium(): Promise<Browser> {
  const { chromium } = await import("playwright");
  const useSystem = process.env.HOICHOI_USE_SYSTEM_BROWSER === "1";
  const system = systemChannels();

  const attempts: LaunchAttempt[] = [];
  if (useSystem) {
    for (const ch of system) attempts.push({ label: `system ${ch}`, opts: { channel: ch } });
    attempts.push({ label: "playwright chromium", opts: {} });
  } else {
    attempts.push({ label: "playwright chromium", opts: {} });
    for (const ch of system) attempts.push({ label: `system ${ch}`, opts: { channel: ch } });
  }

  const errors: string[] = [];
  for (const { label, opts } of attempts) {
    try {
      return await chromium.launch({
        headless: true,
        ...opts,
        args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
      });
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message}`);
    }
  }
  throw new Error(
    `No usable browser to launch. Tried:\n  ${errors.join("\n  ")}\n` +
      "Install a Playwright browser (pnpm exec playwright install chromium) " +
      "or a supported system browser (Microsoft Edge / Google Chrome).",
  );
}
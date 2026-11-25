import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Give librsvg a Bengali font before it is asked to draw one.
 *
 * `sharp` has no text API: drawing the caption means compositing an SVG, and
 * librsvg resolves `font-family` through fontconfig. On a CI runner and on a
 * serverless host there is no Bengali face installed, so the caption would ship
 * as tofu boxes — the single worst outcome for a Bangla newsroom, and one that a
 * screenshot of the local machine would never reveal.
 *
 * So the two Noto Sans Bengali faces (SIL OFL, licence shipped beside them) live
 * in this package and are registered by writing a fontconfig file that points at
 * them, once per process, before the first render.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** `<pkg>/fonts` in source and after a bundle, because the files are copied, not compiled. */
export function fontsDir(): string {
  const beside = path.join(HERE, "..", "fonts");
  if (fs.existsSync(beside)) return beside;
  const bundled = path.join(HERE, "fonts");
  if (fs.existsSync(bundled)) return bundled;
  throw new Error(
    `poster fonts not found (looked in ${beside} and ${bundled})`,
  );
}

let registered = false;

/**
 * Register the bundled fonts with fontconfig. Idempotent; safe to call before
 * every render.
 *
 * `FONTCONFIG_FILE` is only honoured if fontconfig has not already initialised
 * in this process, so this must run before the first `sharp` text render — which
 * is why the callers import this module before they import sharp for drawing.
 */
export function ensurePosterFonts(): void {
  if (registered) return;
  const dir = fontsDir();
  // A predictable name in the shared temp dir can be pre-created by another
  // local user (symlink / permission games). mkdtemp creates a fresh 0700 dir.
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), "hoichoi-fontconfig-"));
  try {
    fs.mkdirSync(cache, { recursive: true });
  } catch {
    // A read-only tmp is not fatal: fontconfig will fall back to its own cache.
  }
  const posix = (p: string) => p.split(path.sep).join("/");
  const conf = [
    '<?xml version="1.0"?>',
    '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">',
    "<fontconfig>",
    `  <dir>${posix(dir)}</dir>`,
    `  <cachedir>${posix(cache)}</cachedir>`,
    "</fontconfig>",
  ].join("\n");
  const confPath = path.join(cache, "fonts.conf");
  fs.writeFileSync(confPath, conf, "utf8");
  process.env.FONTCONFIG_FILE = confPath;
  process.env.FONTCONFIG_PATH = path.dirname(confPath);
  registered = true;
}

/** The font family name the caption SVG asks for. Exported so tests can assert it. */
export const POSTER_FONT_FAMILY = "Noto Sans Bengali";

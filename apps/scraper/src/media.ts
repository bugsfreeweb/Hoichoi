import { mediaRoot, ensureMediaDir, localMediaPath, randomMediaName } from "@hoichoi/db";
import * as fs from "node:fs";
import * as path from "node:path";

export { mediaRoot, ensureMediaDir, localMediaPath, randomMediaName };

/**
 * Ensure the parent directory of a media output path exists. Media names carry
 * a date subdirectory (`2026-09-20/img_x.webp`) while ensureMediaDir only
 * creates the root, so every writer must create its own leaf dir.
 */
export function mkdirForFile(outPath: string): string {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  return outPath;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Hoichoi/1.0";

// sharp is loaded lazily (its native prebuild is heavy and clogs webpack
// bundles for consumers that only need mediaRoot / downloadMedia).
async function loadSharp(): Promise<typeof import("sharp")> {
  const { default: sharp } = await import("sharp");
  return sharp;
}

/** Download a remote media file to the local store. */
export async function downloadMedia(url: string, outRel: string): Promise<string> {
  ensureMediaDir();
  const outPath = mkdirForFile(localMediaPath(outRel));
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`download ${url} -> suspiciously small (${buf.length}B)`);
  fs.writeFileSync(outPath, buf);
  return outRel;
}

/** Re-encode & normalize an image via sharp, returns sharp metadata + stored rel path. */
export async function processImage(
  input: Buffer,
  outRel: string,
  opts: {
    maxWidthPx: number;
    /**
     * Fraction of the height to shave off the bottom before resizing.
     *
     * Only the keyless Pollinations hosts need this: they stamp a small
     * `pollinations.ai` mark in the bottom-right corner and ignore `nologo` even
     * with a referrer, so a measured render came back with the logo on it. A
     * newspaper cannot publish a third party's mark, and cropping a thin band is
     * honest — the alternative was a watermark on every AI hero.
     */
    trimBottomFraction?: number;
  },
): Promise<{ rel: string; width: number; height: number; sizeBytes: number }> {
  ensureMediaDir();
  const outPath = mkdirForFile(localMediaPath(outRel));
  let pipeline = (await loadSharp())(input).rotate();
  if (opts.trimBottomFraction && opts.trimBottomFraction > 0) {
    const meta = await pipeline.metadata();
    const h = meta.height ?? 0;
    const keep = Math.max(1, Math.round(h * (1 - Math.min(0.25, opts.trimBottomFraction))));
    if (h > 0) {
      // `extract` must come after orientation so the box matches what was fetched.
      pipeline = (await loadSharp())(input)
        .rotate()
        .extract({ left: 0, top: 0, width: meta.width ?? 1, height: keep });
    }
  }
  const meta = await pipeline
    .resize({ width: opts.maxWidthPx, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outPath);
  return {
    rel: outRel,
    width: meta.width,
    height: meta.height,
    sizeBytes: meta.size,
  };
}

/** Detect whether a Facebook URL points at a video post. */
export function isVideoUrl(url: string): boolean {
  return /facebook\.com\/(?:watch|reel|video|videos|[^/]+\/videos)/i.test(url) || /\.(mp4|webm|m3u8)(\?|$)/i.test(url);
}
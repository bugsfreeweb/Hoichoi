import { mediaRoot, ensureMediaDir, localMediaPath, randomMediaName } from "@hoichoi/db";
import * as fs from "node:fs";

export { mediaRoot, ensureMediaDir, localMediaPath, randomMediaName };

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
  const outPath = localMediaPath(outRel);
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
  opts: { maxWidthPx: number },
): Promise<{ rel: string; width: number; height: number; sizeBytes: number }> {
  ensureMediaDir();
  const outPath = localMediaPath(outRel);
  const meta = await (await loadSharp())(input)
    .rotate()
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
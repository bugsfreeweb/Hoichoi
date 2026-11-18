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
//
// The shape of the module is checked rather than assumed. sharp 0.35 moved its
// type declarations so that `typeof import("sharp")` describes a namespace whose
// call signature is no longer present, and the previous `Promise<typeof
// import("sharp")>` return type failed to compile on it (`Property 'sharp' is
// missing`, `This expression is not callable`). A local factory type says what
// this file actually needs — "something I can call with a Buffer" — and works on
// both.
type SharpFactory = (input: Buffer) => import("sharp").Sharp;

async function loadSharp(): Promise<SharpFactory> {
  const mod: unknown = await import("sharp");
  const factory =
    typeof mod === "function" ? (mod as SharpFactory) : (mod as { default?: SharpFactory }).default;
  if (!factory) throw new Error("sharp module exposes no callable export");
  return factory;
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
  },
): Promise<{ rel: string; width: number; height: number; sizeBytes: number }> {
  ensureMediaDir();
  const outPath = mkdirForFile(localMediaPath(outRel));
  let pipeline = (await loadSharp())(input).rotate();
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
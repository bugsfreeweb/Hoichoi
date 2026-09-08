/**
 * Filesystem-backed media store root. Lives in @hoichoi/db (not the scraper)
 * so the serverless web can resolve the media root without pulling in sharp.
 * Image/video *processing* stays in the scraper; this module is the shared
 * path/resolve layer only.
 */
import { findRepoRoot } from "./client";
import * as fs from "node:fs";
import * as path from "node:path";

/** Filesystem-backed media store under <repo>/data/media (env-overridable for the desktop runtime). */
export function mediaRoot(): string {
  if (process.env.HOICHOI_MEDIA_ROOT) return process.env.HOICHOI_MEDIA_ROOT;
  return path.join(findRepoRoot(), "data", "media");
}

export function ensureMediaDir(): void {
  fs.mkdirSync(mediaRoot(), { recursive: true });
}

export function localMediaPath(rel: string): string {
  // Security: only allow paths inside the media root.
  const root = path.resolve(mediaRoot());
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(root)) {
    throw new Error(`illegal media path: ${rel}`);
  }
  return resolved;
}

export function randomMediaName(kind: "img" | "vid" | "shot", ext: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID().slice(0, 8);
  return `${day}/${kind}_${id}.${ext}`;
}
import { useEffect, useState } from "react";
import { invoke, isTauri } from "./tauri";
import { SITE_URL } from "./site";

/**
 * Desktop picture resolution.
 *
 * The desk DB stores media paths relative to the media root (`2025-01-01/img_x.jpg`).
 * The web app serves those from `/uploads/…`, but a Tauri window has no web
 * server behind it — that is why the desk showed no pictures at all, even for
 * posts whose image the collector had mirrored. Local files are read through the
 * `media_bytes` Rust command and turned into blob URLs; remote URLs pass through
 * untouched.
 *
 * Resolution is cached per path: a queue of twenty rows re-renders on every
 * filter change, and each resolution is an IPC round trip plus a file read.
 */
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/** True for values that must not be handed to the desktop media command. */
export function isRemotePath(p: string): boolean {
  return /^https?:\/\//i.test(p);
}

/**
 * Where a picture should be loaded from when running inside a browser (vite dev
 * preview or the web admin): the site's own static handler. Kept as a fallback
 * so the screens still render outside the Tauri shell.
 */
export function webMediaSrc(p: string): string {
  if (!p) return "";
  if (isRemotePath(p)) return p;
  if (p.startsWith("/")) return `${SITE_URL}${p}`;
  return `${SITE_URL}/uploads/${p.replace(/\\/g, "/")}`;
}

async function resolveLocal(rel: string): Promise<string | null> {
  const key = rel.replace(/\\/g, "/");
  if (cache.has(key)) return cache.get(key) ?? null;
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    try {
      const bytes = await invoke<ArrayBuffer>("media_bytes", { rel: key });
      const buf = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes as unknown as number[]).buffer;
      if (!buf.byteLength) throw new Error("empty media file");
      const blob = new Blob([buf], { type: mimeFor(key) });
      const url = URL.createObjectURL(blob);
      cache.set(key, url);
      return url;
    } catch {
      // Remember the failure so a missing file is not re-read on every render.
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

function mimeFor(p: string): string {
  const ext = p.slice(p.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  return "image/jpeg";
}

/**
 * Resolve one media path to something an `<img>`/`<video>` can load.
 * Returns `null` while resolving and when the file cannot be read.
 */
export function useDeskMedia(path: string | null | undefined): string | null {
  const clean = (path ?? "").trim();
  const [src, setSrc] = useState<string | null>(() => {
    if (!clean) return null;
    if (isRemotePath(clean)) return clean;
    return cache.get(clean.replace(/\\/g, "/")) ?? null;
  });

  useEffect(() => {
    if (!clean) {
      setSrc(null);
      return;
    }
    if (isRemotePath(clean)) {
      setSrc(clean);
      return;
    }
    let alive = true;
    const key = clean.replace(/\\/g, "/");
    const hit = cache.get(key);
    if (hit !== undefined) {
      setSrc(hit);
      return;
    }
    if (!isTauri()) {
      setSrc(webMediaSrc(clean));
      return;
    }
    void resolveLocal(key).then((url) => {
      if (alive) setSrc(url ?? webMediaSrc(clean));
    });
    return () => {
      alive = false;
    };
  }, [clean]);

  return src;
}

import type { SourceType } from "@hoichoi/shared-types";

/** Infer provenance from the row, then from the original URL. Server-safe. */
export function inferSourceType(post: {
  source_type?: SourceType | null;
  source_url?: string | null;
  source_name?: string | null;
}): SourceType {
  if (post.source_type && post.source_type !== "unknown")
    return post.source_type;
  const raw = (post.source_url ?? "").trim();
  if (!raw) return "unknown";
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return "unknown";
  }
  // Compare the hostname, never the whole URL: `fb.com.example` and
  // `notfb.com` are not Facebook, and a path or query may contain those words.
  const host = url.hostname.toLowerCase();
  if (
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.com" ||
    host.endsWith(".fb.com") ||
    host === "fb.watch" ||
    host.endsWith(".fb.watch")
  ) {
    return "facebook";
  }
  if (/(^|\.)gov(\.[a-z]{2})?$/.test(host) || host.endsWith(".government")) {
    return "government";
  }
  if (url.protocol === "http:" || url.protocol === "https:") return "news";
  return "unknown";
}

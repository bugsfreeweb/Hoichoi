import type { SourceType } from "@hoichoi/shared-types";

/** Infer provenance from the row, then from the original URL. Server-safe. */
export function inferSourceType(post: {
  source_type?: SourceType | null;
  source_url?: string | null;
  source_name?: string | null;
}): SourceType {
  if (post.source_type && post.source_type !== "unknown")
    return post.source_type;
  const url = (post.source_url ?? "").toLowerCase();
  if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
  if (url.includes(".gov")) return "government";
  if (url.startsWith("http")) return "news";
  return "unknown";
}

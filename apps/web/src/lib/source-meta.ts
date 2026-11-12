/**
 * Where a post actually came from.
 *
 * The article page used to hardcode Facebook everywhere — the archive card, the
 * "screenshot archive" badge, the attribution sentence and the at-a-glance row
 * all said Facebook even for RSS/YouTube/X items. `posts` has no platform
 * column, so the platform is derived once here from `source_url` and the source
 * name, and every surface reads from this module.
 */

export type SourcePlatform = "facebook" | "x" | "youtube" | "instagram" | "news" | "other";

const PLATFORM_LABEL: Record<SourcePlatform, { en: string; bn: string }> = {
  facebook: { en: "FACEBOOK", bn: "ফেসবুক" },
  x: { en: "X (TWITTER)", bn: "এক্স" },
  youtube: { en: "YOUTUBE", bn: "ইউটিউব" },
  instagram: { en: "INSTAGRAM", bn: "ইনস্টাগ্রাম" },
  news: { en: "NEWS FEED", bn: "সংবাদ ফিড" },
  other: { en: "OPEN SOURCE", bn: "উন্মুক্ত সোর্স" },
};

/** Resolve the platform from a post's source URL (falling back to its name). */
export function sourcePlatform(post: { source_url?: string | null; source_name?: string | null }): SourcePlatform {
  const url = (post.source_url ?? "").toLowerCase();
  const name = (post.source_name ?? "").toLowerCase();
  if (/facebook\.com|fb\.com|fb\.me|m\.facebook/.test(url)) return "facebook";
  if (/(^|\/\/|\.)x\.com|twitter\.com/.test(url)) return "x";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (url) {
    // Anything with a host that is not a social platform is a news/RSS source.
    if (/^https?:\/\//.test(url)) return "news";
  }
  if (/facebook|ফেসবুক/.test(name)) return "facebook";
  if (/twitter|\bx\b/.test(name)) return "x";
  if (/youtube/.test(name)) return "youtube";
  if (/instagram/.test(name)) return "instagram";
  return url ? "news" : "other";
}

/** Uppercase badge for the media frame: `SOURCE · FACEBOOK ARCHIVE` etc. */
export function sourceBadge(
  post: { source_url?: string | null; source_name?: string | null },
  kind: "image" | "video" | "none" = "image",
): string {
  const p = sourcePlatform(post);
  const word = kind === "video" ? "SOURCE · VIDEO" : p === "news" ? "SOURCE · NEWS ARCHIVE" : `SOURCE · ${PLATFORM_LABEL[p].en} ARCHIVE`;
  return word;
}

/** Human Bengali label used in sentences: "ফেসবুকের উন্মুক্ত পোস্ট" etc. */
export function sourcePhraseBn(post: { source_url?: string | null; source_name?: string | null }): string {
  const p = sourcePlatform(post);
  switch (p) {
    case "facebook":
      return "ফেসবুকের উন্মুক্ত পোস্ট";
    case "x":
      return "এক্স (টুইটার) পোস্ট";
    case "youtube":
      return "ইউটিউব ভিডিও";
    case "instagram":
      return "ইনস্টাগ্রাম পোস্ট";
    case "news":
      return "সংবাদমাধ্যমের প্রকাশিত রিপোর্ট";
    default:
      return "উন্মুক্ত সোর্স";
  }
}

/** Short stand-alone platform name: "ফেসবুক", "সংবাদ ফিড" … */
export function sourcePlatformBn(post: { source_url?: string | null; source_name?: string | null }): string {
  return PLATFORM_LABEL[sourcePlatform(post)].bn;
}

/** Card/board styling for the archive panel (avatar glyph + accent). */
export function sourceVisual(post: { source_url?: string | null; source_name?: string | null }): {
  glyph: string;
  ring: string;
  tint: string;
  labelBn: string;
} {
  const p = sourcePlatform(post);
  switch (p) {
    case "facebook":
      return { glyph: "f", ring: "from-fb to-[#0a4fab]", tint: "#1877f2", labelBn: "ফেসবুক" };
    case "x":
      return { glyph: "𝕏", ring: "from-[#1a1a1a] to-[#000]", tint: "#0f1419", labelBn: "এক্স" };
    case "youtube":
      return { glyph: "▶", ring: "from-[#ff0000] to-[#a80000]", tint: "#ff0000", labelBn: "ইউটিউব" };
    case "instagram":
      return { glyph: "◎", ring: "from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]", tint: "#ee2a7b", labelBn: "ইনস্টাগ্রাম" };
    case "news":
      return { glyph: "▤", ring: "from-[#2f6f4f] to-[#173d2a]", tint: "#2f6f4f", labelBn: "সংবাদ ফিড" };
    default:
      return { glyph: "◈", ring: "from-[#7a8593] to-[#3d4552]", tint: "#7a8593", labelBn: "সোর্স" };
  }
}

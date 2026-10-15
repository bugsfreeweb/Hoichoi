/**
 * Editorial imagery for every report.
 * Images are chosen per story, with a category-level fallback so any
 * newly added report always renders with a sensible visual.
 */

/** Explicit per-report artwork. */
export const POST_IMAGES: Record<string, string> = {
  "mrbeast-4-35e7b1": "/images/posts/construction-win.jpg",
  "missing-child-rangpur-8d2c41": "/images/posts/missing-child.jpg",
  "affair-crime-dhaka-b71f09": "/images/posts/police-night.jpg",
  "child-protection-sylhet-c40a17": "/images/posts/child-safety.jpg",
  "chittagong-road-accident-e91b33": "/images/posts/highway-night.jpg",
  "fraud-bogura-job-scam-5a77d2": "/images/posts/fraud-documents.jpg",
  "family-violence-khulna-2f6c88": "/images/posts/police-night.jpg",
  "dhaka-fire-mitford-9c31ee": "/images/posts/fire-rescue.jpg",
  "cox-bazar-boat-rescue-1d94af": "/images/posts/sea-trawler.jpg",
  "rajshahi-river-erosion-7b2d50": "/images/posts/sea-trawler.jpg",
};

/** Fallback artwork by subject area. */
export const CATEGORY_IMAGES: Record<string, string> = {
  "viral-verify": "/images/posts/construction-win.jpg",
  "missing-child": "/images/posts/missing-child.jpg",
  "affair-crime": "/images/posts/police-night.jpg",
  "family-violence": "/images/posts/police-night.jpg",
  "child-abuse": "/images/posts/child-safety.jpg",
  "road-accident": "/images/posts/highway-night.jpg",
  fraud: "/images/posts/fraud-documents.jpg",
  disaster: "/images/posts/fire-rescue.jpg",
  environment: "/images/posts/sea-trawler.jpg",
};

export const DEFAULT_POST_IMAGE = "/images/newsroom.jpg";

export function resolvePostImage(slug: string, categorySlug = "", explicit = ""): string {
  if (explicit && explicit.trim()) return explicit;
  return POST_IMAGES[slug] ?? CATEGORY_IMAGES[categorySlug] ?? DEFAULT_POST_IMAGE;
}

/** Short Bangla caption shown under cover images. */
export function imageCaption(source: string): string {
  return `প্রতীকী ছবি · সংবাদের প্রেক্ষাপট অনুযায়ী নির্বাচিত · সূত্র: ${source || "হৈচৈ আর্কাইভ"}`;
}

/**
 * Editorial cover imagery for the design-variant (mockup) pages.
 *
 * The mockup themes render the *same* real artwork the default design shows, so
 * a report's own scraped media always wins, and the operator's configured
 * default post image is used when a report has no media of its own. Only when
 * neither exists do we fall back to the bundled placeholder.
 *
 * This module used to point at per-story/category JPEGs (`/images/posts/…`,
 * `/images/newsroom.jpg`) that were never shipped in `apps/web/public`, so every
 * media-less report rendered a dead `<img>` — which is why the non-default
 * designs looked "image-less" while the default design (which resolves media
 * through `mediaUrl`) stayed intact.
 */

/** Committed fallback artwork (see `apps/web/public/images/post-placeholder.svg`). */
export const PLACEHOLDER_IMAGE = "/images/post-placeholder.svg";

/**
 * Pick the cover image for a report.
 *
 * @param explicit  The report's own media, already resolved to a public URL.
 * @param fallback  The admin-configured default post image (may be empty).
 */
export function resolvePostImage(
  _slug: string,
  _categorySlug = "",
  explicit = "",
  fallback = "",
): string {
  const own = explicit.trim();
  if (own) return own;
  const configured = fallback.trim();
  if (configured) return configured;
  return PLACEHOLDER_IMAGE;
}

/** Short Bangla caption shown under cover images. */
export function imageCaption(source: string): string {
  return `প্রতীকী ছবি · সংবাদের প্রেক্ষাপট অনুযায়ী নির্বাচিত · সূত্র: ${source || "হৈচৈ আর্কাইভ"}`;
}

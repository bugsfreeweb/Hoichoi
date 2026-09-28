/**
 * Canonical origin of the public site.
 *
 * Absolute URLs matter for social sharing and SEO: `metadataBase` turns every
 * relative `openGraph.images` / `twitter.images` entry into an absolute URL, and
 * the sitemap and robots files need the same origin. The old inline fallback
 * was the placeholder `https://hoichoi.local`, so on Vercel — where neither
 * SITE_URL nor NEXT_PUBLIC_SITE_URL was set — every shared image resolved to a
 * host that does not exist and Facebook/Twitter could not fetch the preview.
 *
 * Order: explicit config, then the project's stable production domain, then a
 * hard-coded fallback to the real production URL. Normalised to https with no
 * trailing slash so callers can safely interpolate `${siteUrl()}/path`.
 *
 * `NEXT_PUBLIC_VERCEL_URL` is deliberately NOT consulted: Vercel fills it with
 * the URL of the *current deployment* (e.g.
 * `hoichoifeed-qn9iouwpt-bugsfrees-projects.vercel.app`), so using it made the
 * sitemap and canonical URLs change on every deploy and point at an ephemeral
 * preview host. `VERCEL_PROJECT_PRODUCTION_URL` is the stable production domain
 * and is the right automatic source.
 */
const FALLBACK = "https://hoichoifeed.vercel.app";

export function siteUrl(): string {
  const raw =
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    FALLBACK;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return FALLBACK;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

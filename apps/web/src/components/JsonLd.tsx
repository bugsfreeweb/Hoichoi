import { siteUrl } from "@/lib/site";

/**
 * Structured data: the story, the publisher, the site.
 *
 * Three rules keep this honest:
 *  1. **Only facts we hold.** Headline, dates, image, author (the desk) and the
 *     canonical URL come from the row; nothing is invented to look richer.
 *  2. **Removed content is never described.** A page that 404s must not leave a
 *     NewsArticle behind for a crawler to keep showing in results, so the post
 *     page only renders this for a live row.
 *  3. **Escape the payload.** JSON is embedded in a `<script>` tag; a body that
 *     contained `</script>` would otherwise break out of it.
 *
 * `dateModified` is the row's `updated_at`, which is what the CMS actually
 * touched — not "now", which would make every crawl look like a fresh edit.
 */
export interface NewsArticleInput {
  slug: string;
  headline: string;
  summary: string;
  publishedAt: string | null;
  updatedAt: string | null;
  image: string | null;
  category: string;
  categoryBn: string;
  siteName: string;
}

function absolute(url: string | null): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${siteUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function newsArticleJsonLd(input: NewsArticleInput): Record<string, unknown> {
  const url = `${siteUrl()}/post/${input.slug}`;
  const image = absolute(input.image);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.headline.slice(0, 110),
    description: input.summary.slice(0, 300),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "bn-BD",
    articleSection: input.categoryBn,
    datePublished: input.publishedAt ?? undefined,
    dateModified: input.updatedAt ?? input.publishedAt ?? undefined,
    ...(image ? { image: [image] } : {}),
    publisher: {
      "@type": "Organization",
      name: input.siteName,
      url: siteUrl(),
    },
    isAccessibleForFree: true,
  };
}

export function siteJsonLd(siteName: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl(),
    inLanguage: "bn-BD",
    publisher: { "@type": "Organization", name: siteName, url: siteUrl() },
  };
}

/** Renders one JSON-LD block. `dangerouslySetInnerHTML` is safe here: escaped. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeJson(data) }} />;
}
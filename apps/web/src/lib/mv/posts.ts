import { getPublicPostBySlug, relatedPosts, windowPosts, parseAppConfig } from "@hoichoi/db";
import { resolvePostImage } from "@/lib/mv/images";
import { toMvPost } from "@/lib/mv/convert";
import { settingImageUrl } from "@/lib/media";
import { getSettings } from "@/lib/settings";

export type PostRecord = {
  slug: string;
  hash: string;
  title: string;
  titleEn: string;
  dek: string;
  rawFeed: string;
  category: string;
  categorySlug: string;
  source: string;
  sourceUrl: string;
  author: string;
  location: string;
  image: string;
  tags: string[];
  body: Array<Record<string, unknown>>;
  keyPoints: string[];
  timeline: Array<Record<string, unknown>>;
  facts: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
  factScore: number;
  views: number;
  shares: number;
  comments: number;
  readMinutes: number;
  featured: boolean;
  publishedAt: Date;
};

/** The operator-configured default post image, resolved to a public URL. */
async function defaultCoverImage(): Promise<string> {
  try {
    const settings = await getSettings();
    const cfg = parseAppConfig(settings.app_config_json);
    return settingImageUrl(cfg.default_post_image) ?? "";
  } catch {
    return "";
  }
}

/** Guarantees every report always carries a usable cover image. */
function withImage<T extends { slug: string; categorySlug: string; image?: string | null }>(
  row: T,
  fallback = "",
): T & { image: string } {
  return { ...row, image: resolvePostImage(row.slug, row.categorySlug, row.image ?? "", fallback) };
}

/**
 * Mockup-theme articles.
 *
 * These drive the design-variant home/post pages, so they render the real
 * published feed — an operator who switches the site to a mockup theme must see
 * the same stories the default design shows. When the archive window is empty
 * (a brand-new install before the first run) the list is empty; nothing is
 * fabricated to fill the page.
 */
export async function listPosts(limit = 12): Promise<PostRecord[]> {
  const fallback = await defaultCoverImage();
  try {
    const rows = await windowPosts({ limit });
    return rows.map((r) => withImage(toMvPost(r, fallback), fallback));
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<PostRecord | null> {
  const fallback = await defaultCoverImage();
  try {
    const row = await getPublicPostBySlug(slug);
    return row ? withImage(toMvPost(row, fallback), fallback) : null;
  } catch {
    return null;
  }
}

export async function getRelated(slug: string, categorySlug: string, limit = 3): Promise<PostRecord[]> {
  const fallback = await defaultCoverImage();
  try {
    const post = await getPublicPostBySlug(slug);
    if (!post) return [];
    const rows = await relatedPosts(post, limit);
    return rows.map((r) => withImage(toMvPost(r, fallback), fallback));
  } catch {
    return [];
  }
}

export function postUrl(slug: string): string {
  return `/post/${slug}`;
}

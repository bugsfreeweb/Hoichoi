import { getPublicPostBySlug, relatedPosts, windowPosts, parseAppConfig } from "@hoichoi/db";
import { SEED_POSTS, type SeedPost } from "@/lib/mv/content";
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

function fromSeed(p: SeedPost, fallback = ""): PostRecord {
  return withImage(
    {
      ...p,
      image: "",
      body: p.body as unknown as Array<Record<string, unknown>>,
      timeline: p.timeline as unknown as Array<Record<string, unknown>>,
      facts: p.facts as unknown as Array<Record<string, unknown>>,
      metrics: p.metrics as unknown as Record<string, unknown>,
      publishedAt: new Date(p.publishedAt),
    },
    fallback,
  ) as PostRecord;
}

/**
 * Mockup-theme articles.
 *
 * These drive the design-variant home/post pages, so they must render the
 * real published feed rather than bundled sample records: an operator who
 * switches the site to a mockup theme expects to see the same stories the
 * default design shows. The bundled `SEED_POSTS` remain only as a bootstrap
 * fallback so a brand-new install with an empty database still paints a
 * complete page instead of a blank one.
 */
export async function listPosts(limit = 12): Promise<PostRecord[]> {
  const fallback = await defaultCoverImage();
  try {
    const rows = await windowPosts({ limit });
    if (rows.length > 0) return rows.map((r) => toMvPost(r, fallback));
  } catch {
    // fall through to the bootstrap sample
  }
  return SEED_POSTS.slice(0, limit).map((p) => fromSeed(p, fallback));
}

export async function getPost(slug: string): Promise<PostRecord | null> {
  const fallback = await defaultCoverImage();
  try {
    const row = await getPublicPostBySlug(slug);
    if (row) return toMvPost(row, fallback);
  } catch {
    // fall through to the bootstrap sample
  }
  const seed = SEED_POSTS.find((p) => p.slug === slug);
  return seed ? fromSeed(seed, fallback) : null;
}

export async function getRelated(slug: string, categorySlug: string, limit = 3): Promise<PostRecord[]> {
  const fallback = await defaultCoverImage();
  try {
    const post = await getPublicPostBySlug(slug);
    if (post) {
      const rows = await relatedPosts(post, limit);
      if (rows.length > 0) return rows.map((r) => toMvPost(r, fallback));
    }
  } catch {
    // fall through to the bootstrap pool
  }
  const pool = SEED_POSTS.filter((p) => p.slug !== slug);
  const same = pool.filter((p) => p.categorySlug === categorySlug);
  const rest = pool.filter((p) => p.categorySlug !== categorySlug);
  return [...same, ...rest].slice(0, limit).map((p) => fromSeed(p, fallback));
}

export function postUrl(slug: string): string {
  return `/post/${slug}`;
}

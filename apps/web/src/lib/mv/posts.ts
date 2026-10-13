import { SEED_POSTS, type SeedPost } from "@/lib/mv/content";
import { resolvePostImage } from "@/lib/mv/images";

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

/** Guarantees every report always carries a usable cover image. */
function withImage<T extends { slug: string; categorySlug: string; image?: string | null }>(row: T): T & { image: string } {
  return { ...row, image: resolvePostImage(row.slug, row.categorySlug, row.image ?? "") };
}

function fromSeed(p: SeedPost): PostRecord {
  return withImage({
    ...p,
    image: "",
    body: p.body as unknown as Array<Record<string, unknown>>,
    timeline: p.timeline as unknown as Array<Record<string, unknown>>,
    facts: p.facts as unknown as Array<Record<string, unknown>>,
    metrics: p.metrics as unknown as Record<string, unknown>,
    publishedAt: new Date(p.publishedAt),
  }) as PostRecord;
}

export async function listPosts(limit = 12): Promise<PostRecord[]> {
  return SEED_POSTS.slice(0, limit).map(fromSeed);
}

export async function getPost(slug: string): Promise<PostRecord | null> {
  const seed = SEED_POSTS.find((p) => p.slug === slug);
  return seed ? fromSeed(seed) : null;
}

export async function getRelated(slug: string, categorySlug: string, limit = 3): Promise<PostRecord[]> {
  const pool = SEED_POSTS.filter((p) => p.slug !== slug);
  const same = pool.filter((p) => p.categorySlug === categorySlug);
  const rest = pool.filter((p) => p.categorySlug !== categorySlug);
  return [...same, ...rest].slice(0, limit).map(fromSeed);
}

export function postUrl(slug: string): string {
  return `/post/${slug}`;
}
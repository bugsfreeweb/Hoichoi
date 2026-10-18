import { shortId } from "@/lib/bn";
import type { PostRecord } from "@/lib/mv/posts";
import { resolvePostImage } from "@/lib/mv/images";
import { mediaUrl } from "@/lib/media";

/** A public-site article row — everything needed to render mockup post designs
 *  for real production articles (seed posts keep their own richer records). */
export interface ProdPostLike {
  id: string;
  slug: string;
  title_bn: string;
  summary_bn: string | null;
  body_bn: string;
  category: string;
  source_name: string | null;
  source_url: string | null;
  original_author_name: string | null;
  media_path: string | null;
  created_at: string;
  published_at: string | null;
}

function paragraphs(text: string): string[] {
  const out = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return out.length > 0 ? out : [text.trim()];
}

export function toMvPost(post: ProdPostLike, fallback = ""): PostRecord {
  const body = paragraphs(post.body_bn);
  // `media_path` is stored relative (e.g. `2026-09-15/img_….webp`); it must be
  // resolved to a `/uploads/…` public URL the exact way the default design does
  // (`mediaUrl`), otherwise the mockup themes request it relative to the current
  // route and every cover 404s.
  const own = post.media_path
    ? mediaUrl({ media_path: post.media_path, media_kind: "image" }) ?? ""
    : "";
  return {
    slug: post.slug,
    hash: shortId(post.id),
    title: post.title_bn,
    titleEn: post.title_bn,
    dek: post.summary_bn ?? "",
    rawFeed: post.body_bn,
    category: post.category,
    categorySlug: post.category,
    source: post.source_name ?? "সূত্র",
    sourceUrl: post.source_url ?? "",
    author: post.original_author_name ?? "হৈচৈ ফ্যাক্ট-গেট",
    location: "ঢাকা",
    image: resolvePostImage(post.slug, post.category, own, fallback),
    tags: [],
    body: body.map((text) => ({ type: "para", text })),
    keyPoints: [],
    timeline: [],
    facts: [],
    metrics: {},
    factScore: 0,
    views: 0,
    shares: 0,
    comments: 0,
    readMinutes: Math.max(1, Math.round(post.body_bn.length / 2500)),
    featured: false,
    publishedAt: new Date(post.published_at ?? post.created_at),
  };
}
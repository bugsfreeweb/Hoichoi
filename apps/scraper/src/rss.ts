/**
 * RSS/Atom ingestion for non-Facebook sources.
 *
 * The pipeline is built around `ScrapedPost` (facebook.ts). Rather than fork a
 * second pipeline, feed sources are adapted into the same shape so every later
 * step — raw insert, media download, pHash, classify, rewrite, dedup — runs
 * unchanged. Sources created with `--platform news|magazine` store the feed URL
 * in `page_url`; `runPipeline` picks the adapter by platform.
 *
 * The parser is deliberately dependency-free (no XML library) and tolerant: it
 * only needs stable block splitting plus tag/attribute extraction, which regex
 * over real-world feeds handles just as well as a DOM while doubling as the
 * data-shape test below.
 */
import { createHash } from "node:crypto";
import type { ScrapedPost } from "./facebook";

/** Platforms whose `page_url` is a feed URL rather than a Facebook page. */
export function isFeedPlatform(platform: string | null | undefined): boolean {
  return platform === "news" || platform === "magazine";
}

const FA_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Hoichoi/1.0";

export interface FeedFetchOptions {
  feedName?: string;
  maxPosts?: number;
  requestDelayMs?: number;
  log?: (msg: string) => void;
}

/** Inner text of the first `<tag>` in a block, with CDATA/entities stripped. */
export function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "i"))?.[0];
  return stripHtml(match ?? "");
}

/** First `href` from atom `<link ...>` (prefers alternate). */
export function feedLink(block: string): string {
  const links = [...block.matchAll(/<link[\s>][^>]*>/gi)].map((m) => m[0]);
  const preferred = links.find((l) => /rel=["']alternate["']/i.test(l)) ?? links[0];
  if (!preferred) return tagText(block, "link");
  const href = preferred.match(/href=["']([^"']*)["']/i)?.[1];
  return href ? decodeEntities(href.trim()) : tagText(block, "link");
}

/** Strip CDATA, every tag, and XML/HTML entities from mixed feed text. */
export function stripHtml(input: string): string {
  return decodeEntities((input ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

/** Decode the handful of XML/HTML entities feeds actually use. */
export function decodeEntities(input: string): string {
  return (input ?? "")
    .replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp|#39);/gi, (m, e) => {
      const k = e.toLowerCase();
      if (k.startsWith("#")) {
        const num = k.startsWith("#x") ? Number.parseInt(k.slice(2), 16) : Number.parseInt(k.slice(1), 10);
        return String.fromCodePoint(num || 63);
      }
      return NAMED[k] ?? m;
    })
    .trim();
}

/** Image URLs embedded in an HTML description block. */
function imgSrcsFrom(content: string): string[] {
  return [...content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]!.trim()).filter(Boolean);
}

/** Collect every image/video URL a feed entry advertises. */
export function entryMediaUrls(block: string): { urls: string[]; video: boolean } {
  const urls: string[] = [];
  let video = false;
  const push = (u: string | undefined) => {
    if (u && /^https?:\/\//i.test(u)) urls.push(u);
  };
  // enclosure (RSS 2.0) & media:content / media:thumbnail / media:url
  for (const [tag, attr] of [
    ["enclosure", "url"],
    ["media:content", "url"],
    ["media:thumbnail", "url"],
    ["media:url", "url"],
  ] as const) {
    for (const m of block.matchAll(new RegExp(`<${tag}[\\s>][^>]*>`, "gi"))) {
      const hit = m[0]!.match(new RegExp(`${attr}=["']([^"']*)["']`, "i")) ?? m[0]!.match(new RegExp(`${attr}=([^\\s"'/>]+)`, "i"));
      push(decodeEntities(hit?.[1] ?? ""));
      if (/media:content|enclosure/i.test(tag) && /type=["']video\//i.test(m[0]!)) video = true;
    }
  }
  const content = tagText(block, "content:encoded") || tagText(block, "content") || tagText(block, "summary");
  for (const img of imgSrcsFrom(block)) push(img);
  if (urls.some((u) => /\.(mp4|webm|m3u8)(\?|$)/i.test(u))) video = true;
  return { urls: [...new Set(urls)], video };
}

/** Extract posts from RSS 2.0, Atom and RDF feed XML. */
export function parseRssFeed(xml: string, feedName = "feed"): ScrapedPost[] {
  const blocks = [
    ...[...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]!),
    ...[...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]!),
  ];
  const posts: ScrapedPost[] = [];
  for (const block of blocks) {
    const link = feedLink(block) || tagText(block, "guid") || "";
    if (!link) continue;
    const title = tagText(block, "title");
    const description = tagText(block, "description");
    const content = tagText(block, "content:encoded") || tagText(block, "content") || tagText(block, "summary");
    const body = content || description;
    const rawText = title ? (body ? `${title}\n\n${body}` : title) : body;
    if (!rawText) continue;
    const { urls: mediaUrls, video } = entryMediaUrls(block);
    const guid = tagText(block, "guid") || link;
    const pub = tagText(block, "pubDate") || tagText(block, "updated") || tagText(block, "dc:date");
    const author = tagText(block, "dc:creator") || tagText(block, "media:credit") || tagText(block, "author") || feedName;
    posts.push({
      fbPostId: `rss_${createHash("sha256").update(guid).digest("hex").slice(0, 24)}`,
      fbPostUrl: link,
      rawText,
      mediaUrls,
      postTimestamp: pub,
      fbMediaIsVideo: video,
      authorName: author,
    });
  }
  return posts;
}

/** Fetch a feed and adapt its entries into pipeline ScrapedPosts. */
export async function fetchRssPosts(feedUrl: string, opts: FeedFetchOptions = {}): Promise<ScrapedPost[]> {
  const log = opts.log ?? (() => undefined);
  const res = await fetch(feedUrl, {
    headers: { "user-agent": FA_UA, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`feed HTTP ${res.status} for ${feedUrl}`);
  const posts = parseRssFeed(await res.text(), opts.feedName ?? feedUrl);
  log(`[feed] ${feedUrl} → ${posts.length} entries`);
  return posts.slice(0, opts.maxPosts ?? 200);
}
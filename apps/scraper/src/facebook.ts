import { createHash } from "node:crypto";
import type { CategorySlug, Source } from "@hoichoi/shared-types";
import { launchChromium, type Browser, type Page } from "./browser";
import { canonicalPostUrl } from "./dedup";

/**
 * Deterministic post key, derived from the *canonical* permalink so that
 * `UNIQUE (source_id, fb_post_id)` collapses re-scrapes of the same post.
 *
 * This must be a real digest. It used to be
 * `base64url(Buffer.from(url)).slice(0, 20)`, which only encodes the first ~15
 * bytes — for every `https://www.facebook.com/...` URL that is the identical
 * prefix `https://www.faceb`, so *every post on a page produced the same
 * fb_post_id* and `ON CONFLICT (source_id, fb_post_id) DO NOTHING` silently
 * threw away all but the first post scraped from each source.
 */
export function fbPostKey(url: string): string {
  return `fb_${createHash("sha256").update(canonicalPostUrl(url)).digest("hex").slice(0, 24)}`;
}

export interface ScrapedPost {
  fbPostId: string;
  fbPostUrl: string;
  rawText: string | null;
  mediaUrls: string[];
  postTimestamp: string;
  fbMediaIsVideo: boolean;
  authorName?: string;
  authorProfileUrl?: string;
}

export interface ScrapeOptions {
  sessionCookie?: string | null;
  maxPosts?: number;
  requestDelayMs?: number;
  mock?: boolean;
  log?: (msg: string) => void;
}

const PAGE_URL_RE =
  /^https:\/\/(?:www\.|m\.|mbasic\.)?facebook\.com\/(?:(?:pages\/[^/?#]+\/\d+|groups\/[^/?#]+|pg\/[a-zA-Z0-9.\-]+)|[a-zA-Z0-9.\-]+(?:\/posts\/[^/?#]+)?\/?)$/i;

/**
 * Accept only explicit Facebook page, profile, and group source URLs.
 * Scraping still uses normal public page access and does not bypass login walls.
 */
export function isAllowedPageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !/(^|\.)facebook\.com$/i.test(u.hostname)) return false;
    if (/^\/(?:photo\.php|watch|reel|story\.php|share|messages|events)(?:\/|$)/i.test(u.pathname)) return false;
    const profileRoute =
      u.pathname.toLowerCase() === "/profile.php" && /^\d+$/.test(u.searchParams.get("id") ?? "");
    const peopleRoute = /^\/people\/[^/?#]+\/\d+\/?$/i.test(u.pathname);
    return profileRoute || peopleRoute || PAGE_URL_RE.test(`${u.origin}${u.pathname}`);
  } catch {
    return false;
  }
}

export function isPersonalProfileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)facebook\.com$/i.test(parsed.hostname) &&
      ((parsed.pathname.toLowerCase() === "/profile.php" && /^\d+$/.test(parsed.searchParams.get("id") ?? "")) ||
        /^\/people\/[^/?#]+\/\d+\/?$/i.test(parsed.pathname))
    );
  } catch {
    return false;
  }
}

const MOCK_TEMPLATES: Array<{
  category: CategorySlug;
  text: string;
  author: string;
  media: string;
  video: boolean;
}> = [
  {
    category: "missing-children",
    text: "জরুরি: আমাদের এলাকার ৭ বছরের শিশু রাফি আজ সকাল ৯টায় স্কুলের পথে নিখোঁজ হয়েছে। শেষ দেখা: মিরপুর-১০ গোলচত্বর, নীল জামা, কালো ব্যাগ। কেউ দেখলে ০১৯...-এ যোগাযোগ করুন। প্লিজ শেয়ার করুন।",
    author: "মিরপুর সংবাদ",
    media: "https://images.pexels.com/photos/7232021/pexels-photo-7232021.jpeg",
    video: false,
  },
  {
    category: "extramarital-crime",
    text: "এক ব্যক্তি পরকীয়া সম্পর্কের অন্তরঙ্গ ছবি দেখিয়ে এক নারীকে দীর্ঘদিন ধরে ব্ল্যাকমেইল করছেন। ভুক্তভোগী বলেছেন, টাকা না দিলে ছবি ছড়িয়ে দেওয়ার হুমকি দেওয়া হয়। থানায় মামলা হয়েছে।",
    author: "ঢাকা টাইমস ২৪",
    media: "https://images.pexels.com/photos/2422588/pexels-photo-2422588.jpeg",
    video: false,
  },
  {
    category: "child-sexual-abuse",
    text: "একটি মাদ্রাসার এক শিক্ষার্থী (শিশু) এর বিরুদ্ধে যৌন নির্যাতনের অভিযোগ উঠেছে। অভিভাবকদের অভিযোগের ভিত্তিতে থানা তদন্ত শুরু করেছে। প্রতিষ্ঠানের নাম ও শিশুর পরিচয় গোপন রাখা হয়েছে।",
    author: "ডেমো অ্যাডভোকেসি পেজ",
    media: "https://images.pexels.com/photos/5876695/pexels-photo-5876695.jpeg",
    video: false,
  },
  {
    category: "missing-children",
    text: "একটি ভিডিও ভাইরাল — দাবি করা হচ্ছে এক ব্যক্তি স্কুলশিক্ষার্থীকে গাড়িতে তুলে নিয়েছে। পুলিশ বলছে, ঘটনাটি প্রাথমিকভাবে ভিত্তিহীন, গুজব ছড়াবেন না।",
    author: "ফ্যাক্ট চেক বিডি",
    media: "https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg",
    video: true,
  },
];

/** Deterministic mock scraper — lets the whole pipeline run offline for tests/demo. */
export async function scrapeMock(
  sources: Source[],
  opts: ScrapeOptions,
): Promise<ScrapedPost[]> {
  const limit = opts.maxPosts ?? 200;
  const posts: ScrapedPost[] = [];
  let made = 0;
  for (const source of sources) {
    if (made >= limit) break;
    const isVideo = Math.random() < 0.25;
    const template = MOCK_TEMPLATES.find((t) => t.category === source.category);
    const base = template ?? MOCK_TEMPLATES[0]!;
    for (let i = 0; i < 3 && made < limit; i++) {
      posts.push({
        fbPostId: `mock_${source.id}_${Date.now()}_${i}`,
        fbPostUrl: `${source.page_url}/posts/mock_${i}_${Date.now()}`,
        rawText: base.text,
        mediaUrls: [isVideo ? base.media : base.media],
        postTimestamp: new Date(Date.now() - i * 3_600_000).toISOString(),
        fbMediaIsVideo: isVideo,
        authorName: source.page_name,
      });
      made++;
    }
  }
  opts.log?.(`[mock] generated ${posts.length} sample posts`);
  return posts;
}

export async function scrapePage(
  source: Source,
  opts: ScrapeOptions,
): Promise<ScrapedPost[]> {
  if (opts.mock) return scrapeMock([source], opts);
  if (!isAllowedPageUrl(source.page_url)) {
    throw new Error("Unsupported Facebook source URL. Use a public Page, profile, or group URL.");
  }
  try {
    await import("playwright");
  } catch {
    throw new Error(
      "playwright is not installed. Run `pnpm --filter scraper exec playwright install chromium` then retry (or use --mock).",
    );
  }

  const browser = await launchChromium();
  try {
    const isProfileOrGroup = isPersonalProfileUrl(source.page_url) || /\/groups\//i.test(source.page_url);
    let ctx = await newFbContext(browser);
    let page = await ctx.newPage();
    let postUrls = await collectFeedPostUrls(page, source.page_url, opts.maxPosts ?? 50);
    let loginWall = await hasFacebookLoginWall(page);
    if (await hasFacebookAccessChallenge(page)) {
      throw new Error("Facebook showed a CAPTCHA/checkpoint or security challenge; the collector will not bypass it.");
    }

    if (postUrls.length === 0 && loginWall && opts.sessionCookie && !isProfileOrGroup) {
      opts.log?.(`[facebook] public feed showed a login wall; retrying Page source with the configured session`);
      await ctx.close();
      ctx = await newFbContext(browser, opts.sessionCookie);
      page = await ctx.newPage();
      postUrls = await collectFeedPostUrls(page, source.page_url, opts.maxPosts ?? 50);
      loginWall = await hasFacebookLoginWall(page);
      if (await hasFacebookAccessChallenge(page)) {
        throw new Error("Facebook showed a CAPTCHA/checkpoint or security challenge; the collector will not bypass it.");
      }
    }

    if (postUrls.length === 0 && loginWall) {
      throw new Error(
        "Facebook showed a login wall before public posts loaded. Configure an optional session for an authorized Page source, or use a source visible while logged out.",
      );
    }

    const results: Array<ScrapedPost | null> = Array(postUrls.length).fill(null);
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < postUrls.length) {
        const index = nextIndex++;
        const url = postUrls[index]!;
        opts.log?.(`[facebook] visiting post ${index + 1}/${postUrls.length} from ${source.page_name}`);
        const detailPage = await ctx.newPage();
        try {
          results[index] = await extractPost(detailPage, url, opts);
        } finally {
          await detailPage.close();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, postUrls.length) }, worker));
    const posts = results.filter((post): post is ScrapedPost => post !== null);
    if (postUrls.length > 0 && posts.length === 0) {
      throw new Error("Facebook post permalinks returned no accessible content; the page may require login or its layout may have changed.");
    }
    opts.log?.(`[facebook] ${posts.length} posts from ${source.page_name}`);
    return posts;
  } finally {
    await browser.close();
  }
}

async function collectFeedPostUrls(page: Page, sourceUrl: string, maxPosts: number): Promise<string[]> {
  await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const postSelector = "a[href*='/posts/'], a[href*='/permalink/'], a[href*='/videos/']";
  await page.locator(postSelector).first().waitFor({ state: "attached", timeout: 1_500 }).catch(() => undefined);
  const hrefs = new Set<string>();
  for (let attempt = 0; attempt < 4 && hrefs.size < maxPosts; attempt++) {
    const current = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/posts/'], a[href*='/permalink/'], a[href*='/videos/']"))
        .map((a) => a.href),
    );
    current.forEach((href) => hrefs.add(href));
    if (attempt < 3 && hrefs.size < maxPosts) {
      await page.mouse.wheel(0, 3_500);
      await page.waitForTimeout(700);
    }
  }
  return [...hrefs].slice(0, maxPosts);
}

/** Open a fresh logged-in browser context. */
async function newFbContext(browser: Browser, sessionCookie?: string | null) {
  const ctx = await browser.newContext({
    locale: "bn-BD",
    viewport: { width: 1280, height: 2200 },
  });
  if (sessionCookie) await applyFacebookSessionCookie(ctx, sessionCookie);
  return ctx;
}

export function parseFacebookCookieHeader(cookieHeader: string): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
}> {
  const cookies = cookieHeader
    .split(";")
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator <= 0) return null;
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || !value || /[\u0000-\u001f\u007f]/.test(value)) return null;
      return { name, value, domain: ".facebook.com", path: "/", secure: true };
    })
    .filter((cookie): cookie is NonNullable<typeof cookie> => cookie !== null);
  if (cookies.length === 0) {
    throw new Error("Facebook session cookie must be a semicolon-separated list of name=value pairs.");
  }
  return cookies;
}

async function applyFacebookSessionCookie(
  ctx: Awaited<ReturnType<Browser["newContext"]>>,
  cookieHeader: string,
): Promise<void> {
  await ctx.addCookies(parseFacebookCookieHeader(cookieHeader));
}

async function hasFacebookLoginWall(page: Page): Promise<boolean> {
  const path = new URL(page.url()).pathname;
  if (/\/login\/?$/i.test(path)) return true;
  return (await page.locator("form[action*='login'], input[name='email']").count().catch(() => 0)) > 0;
}

async function hasFacebookAccessChallenge(page: Page): Promise<boolean> {
  const path = new URL(page.url()).pathname;
  if (/\/(?:checkpoint|captcha|challenge)(?:\/|$)/i.test(path)) return true;
  return /captcha|security check|checkpoint/i.test(await page.title().catch(() => ""));
}

/**
 * Visit one already-known permalink and pull its text + media frames. Shared by
 * the normal page crawl and by the media recovery path (posts whose raw row was
 * archived away, so the CDN URLs are gone and the page has to be re-visited).
 */
async function extractPost(page: Page, url: string, opts: ScrapeOptions): Promise<ScrapedPost | null> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(opts.requestDelayMs ?? 2_000);
    const id = fbPostKey(url);
    // Prefer the message body over the whole FeedUnit. Both selectors were
    // combined into one `.first()`, which resolves in DOM order, and the
    // FeedUnit wrapper contains the author name, reaction counts and UI chrome
    // ahead of the caption — so a real caption was routinely returned as the
    // surrounding markup text, and a post whose caption lived in a plain
    // `[data-ad-preview='message']` node was reported as caption-less.
    const rawText = await (async () => {
      // Body markers Facebook has used across deployments. The first is the
      // oldest; newer builds mark the caption with `data-ad-comet-preview`
      // and put the whole post inside `role="article"`. Falling through the
      // list means a marker rename degrades to the FeedUnit wrapper instead
      // of silently returning nothing.
      const bodySelectors = [
        "[data-ad-preview='message']",
        "[data-ad-comet-preview='message']",
        "div[role='article'] div[dir='auto']",
      ];
      for (const sel of bodySelectors) {
        const text = await page
          .locator(sel)
          .first()
          .textContent()
          .catch(() => null);
        if (text?.trim()) return text;
      }
      const unit = await page
        .locator("[data-pagelet='FeedUnit']")
        .first()
        .textContent()
        .catch(() => null);
      if (!unit?.trim()) return null;
      // Some captions render in a bare `dir="auto"` block with no marker attr.
      const bare = await page
        .locator("[data-pagelet='FeedUnit'] div[dir='auto']")
        .first()
        .textContent()
        .catch(() => null);
      return bare?.trim() ? bare : unit;
    })();
    const hasVideo = (await page.locator("video").count()) > 0;
    // Collect every media frame on the post — multiple photos plus the video
    // poster when present. The poster is preferred for a video post; the
    // pipeline still falls back to a plain image if the video fails.
    const imgs = await page
      .locator("img[src*='scontent'], img[alt*='photo'], img[src*='p16-sign-va']")
      .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))
      .catch(() => [] as string[]);
    const poster = hasVideo
      ? await page.locator("video + img").first().getAttribute("src").catch(() => null)
      : null;
    const mediaUrls = [
      ...new Set([...(poster ? [poster] : []), ...imgs].filter((u): u is string => Boolean(u && u.startsWith("http")))),
    ].slice(0, 4);
    // A permalink that yields neither words nor picture is indistinguishable
    // downstream from a genuinely caption-less post, so state what the page
    // actually contained. This is the difference between "Facebook served a
    // login wall to this IP" and "the selector stopped matching" - guessing
    // between them costs a whole run.
    if (!rawText?.trim() && mediaUrls.length === 0) {
      const feedUnits = await page.locator("[data-pagelet='FeedUnit']").count().catch(() => -1);
      const loginWall = await hasFacebookLoginWall(page);
      const title = await page.title().catch(() => "");
      opts.log?.(
        `[facebook] empty post feedUnits=${feedUnits} loginWall=${loginWall} ` +
          `title="${title}" at ${page.url().split("?")[0]}`,
      );
      if (loginWall) return null;
    }
    return {
      fbPostId: id,
      fbPostUrl: url,
      rawText: rawText?.slice(0, 4000) ?? null,
      mediaUrls,
      postTimestamp: new Date().toISOString(),
      fbMediaIsVideo: hasVideo,
    };
  } catch (err) {
    opts.log?.(`[facebook] ${url.slice(0, 60)}… failed: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Re-scrape a known list of permalinks (no page crawl). Used by
 * `media backfill --recover` to restore images for posts whose raw_posts row
 * was deleted by the archive pass.
 */
export async function scrapePostUrls(
  urls: string[],
  opts: ScrapeOptions = {},
): Promise<ScrapedPost[]> {
  const unique = [...new Set(urls.map((u) => u.split("?")[0]).filter((u): u is string => Boolean(u)))];
  if (unique.length === 0) return [];
  try {
    await import("playwright");
  } catch {
    throw new Error(
      "playwright is not installed. Run `pnpm --filter scraper exec playwright install chromium` then retry.",
    );
  }
  const browser = await launchChromium();
  try {
    const ctx = await newFbContext(browser, opts.sessionCookie);
    const page = await ctx.newPage();
    const posts: ScrapedPost[] = [];
    for (const url of unique) {
      const scraped = await extractPost(page, url, opts);
      if (scraped) posts.push(scraped);
    }
    opts.log?.(`[facebook] recovered ${posts.length}/${unique.length} permalinks`);
    return posts;
  } finally {
    await browser.close();
  }
}
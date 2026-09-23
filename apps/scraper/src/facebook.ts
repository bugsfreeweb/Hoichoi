import type { CategorySlug, Source } from "@hoichoi/shared-types";
import { launchChromium } from "./browser";

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

const PROFILE_URL_RE =
  /https:\/\/(?:www\.|m\.|mbasic\.)?facebook\.com\/(?:profile\.php\?id=\d+|photo\.php|watch[\/?]|people\/|share\/p\/|groups\/|reel\/|story\.php|messages\/|events\/|\d+)/i;

const PAGE_URL_RE =
  /https:\/\/(?:www\.|m\.|mbasic\.)?facebook\.com\/(?:(?:pages\/|people\/)|[a-zA-Z0-9.\-]+\d{5,}|[a-zA-Z0-9.\-]+\/posts\/|pg\/[a-zA-Z0-9.\-]+)/i;

/**
 * Personal-profile guard — the hard rule in the spec.
 * Anything that resolves to a personal profile URL is skipped.
 * A valid *page* URL must look like a recognized Page handle.
 */
export function isAllowedPageUrl(url: string): boolean {
  if (PROFILE_URL_RE.test(url)) return false;
  if (PAGE_URL_RE.test(url)) return true;
  // Bare page handle like /SomePageName — single non-profile path segment.
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    if (seg.length === 1 && /^[a-zA-Z0-9._-]+$/.test(seg[0]!)) return true;
  } catch {
    return false;
  }
  return false;
}

export function isPersonalProfileUrl(url: string): boolean {
  return PROFILE_URL_RE.test(url);
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
  try {
    await import("playwright");
  } catch {
    throw new Error(
      "playwright is not installed. Run `pnpm --filter scraper exec playwright install chromium` then retry (or use --mock).",
    );
  }

  const browser = await launchChromium();
  try {
    const ctx = await browser.newContext({
      locale: "bn-BD",
      viewport: { width: 1280, height: 2200 },
    });
    if (opts.sessionCookie) {
      await ctx.addCookies([
        {
          name: "c_user",
          value: opts.sessionCookie,
          domain: ".facebook.com",
          path: "/",
        },
      ]);
    }
    const page = await ctx.newPage();
    await page.goto(source.page_url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_500);
    await page.mouse.wheel(0, 6_000);
    await page.waitForTimeout(2_000);
    await page.mouse.wheel(0, 6_000);
    await page.waitForTimeout(1_500);

    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/posts/'], a[href*='/permalink/'], a[href*='/videos/']"))
        .map((a) => a.href),
    );
    const postUrls = [...new Set(hrefs)]
      .filter((h) => !isPersonalProfileUrl(h))
      .slice(0, opts.maxPosts ?? 50);

    const posts: ScrapedPost[] = [];
    for (const url of postUrls) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(opts.requestDelayMs ?? 2_000);
      const id = `fb_${Buffer.from(url).toString("base64url").slice(0, 20)}`;
      const rawText = await page
        .locator("[data-ad-preview='message'], [data-pagelet='FeedUnit']")
        .first()
        .textContent()
        .catch(() => null);
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
      const mediaUrls = [...new Set([...(poster ? [poster] : []), ...imgs].filter((u): u is string => Boolean(u && u.startsWith("http"))))].slice(0, 4);
      posts.push({
        fbPostId: id,
        fbPostUrl: url,
        rawText: rawText?.slice(0, 4000) ?? null,
        mediaUrls,
        postTimestamp: new Date().toISOString(),
        fbMediaIsVideo: hasVideo,
      });
    }
    opts.log?.(`[facebook] ${posts.length} posts from ${source.page_name}`);
    return posts;
  } finally {
    await browser.close();
  }
}
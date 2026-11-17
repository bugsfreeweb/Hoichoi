/**
 * Structured data must describe the page, not decorate it.
 *
 * Two failure modes are worth pinning: a `NewsArticle` left behind for a story
 * that has been taken down (crawlers keep showing a page that 404s), and a
 * payload that breaks out of its own `<script>` tag. Both are cheap to check and
 * invisible to `tsc`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { newsArticleJsonLd, siteJsonLd } from "../src/components/JsonLd";

const root = path.resolve(import.meta.dirname, "..");

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const article = newsArticleJsonLd({
  slug: "test-post",
  headline: "পরীক্ষা শিরোনাম",
  summary: "সংক্ষিপ্ত সারাংশ",
  publishedAt: "2026-01-02T03:04:05.000Z",
  updatedAt: "2026-01-03T04:05:06.000Z",
  image: "/uploads/2026-01-02/a.webp",
  category: "national",
  categoryBn: "জাতীয়",
  siteName: "হৈচৈ",
});

check("the article block is a NewsArticle with a canonical URL", () => {
  assert.equal(article["@type"], "NewsArticle");
  assert.match(String(article.url), /\/post\/test-post$/);
  assert.equal((article.mainEntityOfPage as { "@id": string })["@id"], article.url);
});

check("dates come from the row, not from now", () => {
  assert.equal(article.datePublished, "2026-01-02T03:04:05.000Z");
  assert.equal(article.dateModified, "2026-01-03T04:05:06.000Z");
});

check("dateModified falls back to datePublished when never edited", () => {
  const once = newsArticleJsonLd({
    slug: "x",
    headline: "শিরোনাম",
    summary: "সারাংশ",
    publishedAt: "2026-01-02T03:04:05.000Z",
    updatedAt: null,
    image: null,
    category: "national",
    categoryBn: "জাতীয়",
    siteName: "হৈচৈ",
  });
  assert.equal(once.dateModified, "2026-01-02T03:04:05.000Z");
});

check("a relative image is made absolute; no image means no image key", () => {
  assert.match(String((article.image as string[])[0]), /^https?:\/\/.+\/uploads\//);
  const noImage = newsArticleJsonLd({
    slug: "y",
    headline: "শিরোনাম",
    summary: "",
    publishedAt: null,
    updatedAt: null,
    image: null,
    category: "national",
    categoryBn: "জাতীয়",
    siteName: "হৈচৈ",
  });
  assert.equal("image" in noImage, false);
});

check("the site block names the publisher and the language", () => {
  const site = siteJsonLd("হৈচৈ");
  assert.equal(site["@type"], "WebSite");
  assert.equal(site.inLanguage, "bn-BD");
  assert.equal((site.publisher as { name: string }).name, "হৈচৈ");
});

check("the post page only emits it for a live row", () => {
  const page = fs.readFileSync(path.join(root, "src/app/(site)/post/[slug]/page.tsx"), "utf8");
  const notFoundAt = page.indexOf("notFound()");
  const jsonLdAt = page.indexOf("newsArticleJsonLd(");
  assert.ok(notFoundAt !== -1 && jsonLdAt !== -1);
  assert.ok(notFoundAt < jsonLdAt, "the 404 check must come first");
});

check("the payload is escaped before it goes into the script tag", () => {
  const component = fs.readFileSync(path.join(root, "src/components/JsonLd.tsx"), "utf8");
  assert.match(component, /replace\(\/<\/g, "\\\\u003c"\)/);
  assert.match(component, /replace\(\/\\u2028\/g/);
});

console.log(`\n${passed} JSON-LD checks passed.`);
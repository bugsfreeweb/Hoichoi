import assert from "node:assert/strict";
import {
  canonicalDesk,
  guardCategory,
  needsHumanReview,
  rewriteQuality,
  sourceTypeFromUrl,
} from "../taxonomy";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

check("TechCrunch AI copy is never filed as corruption", () => {
  const r = guardCategory(
    "Trump said pressuring Jensen Huang is 'an option' as NVIDIA GPU exports dominate the AI market.",
    "corruption",
    "Techcrunch",
  );
  assert.equal(r?.slug, "ai");
});

check("startup funding goes to startup or business, not corruption", () => {
  const r = guardCategory(
    "The startup raised a $40M Series B funding round led by a venture capital firm.",
    "corruption",
    "Techcrunch",
  );
  assert.equal(r?.slug, "startup");
});

check("a real corruption investigation keeps its desk", () => {
  assert.equal(
    guardCategory(
      "দুর্নীতির তদন্তে প্রমাণ পাওয়া গেছে, ঘুষ ও তহবিল আত্মসাতের অভিযোগে মামলা হয়েছে।",
      "corruption",
      "দৈনিক",
    ),
    null,
  );
});

check("technology content misfiled elsewhere moves to a tech desk", () => {
  assert.equal(
    guardCategory(
      "Figma released a database feature for developers.",
      "viral",
      "Techcrunch",
    )?.slug,
    "technology",
  );
});

check("a technology outlet's security incident is not filed as business", () => {
  assert.equal(
    guardCategory(
      "হ্যাকাররা ১পাসওয়ার্ডে ঢুকে পড়েছে, গ্রাহকের পাসওয়ার্ড নিরাপদ বলে কোম্পানি দাবি করেছে।",
      "economy",
      "Techcrunch",
    )?.slug,
    "technology",
  );
});

check("a funding story at a technology outlet keeps the business desk", () => {
  assert.equal(
    guardCategory(
      "The company raised a new funding round ahead of its IPO valuation.",
      "economy",
      "Techcrunch",
    ),
    null,
  );
});

check("clear world and health copy leaves the misc desk", () => {
  assert.equal(
    guardCategory(
      "রাশিয়া ও ইউক্রেন যুদ্ধে প্রায় পাঁচ লাখ মানুষ হতাহত হয়েছে।",
      "misc",
      "BBC Bangla",
    )?.slug,
    "international",
  );
  assert.equal(
    guardCategory(
      "গর্ভনিরোধক ব্যবহার নিয়ে প্রচলিত ভ্রান্ত ধারণা ও স্বাস্থ্য পরামর্শ।",
      "misc",
      "BBC Bangla",
    )?.slug,
    "health",
  );
});

check("sensitive desks and political social posts require a human", () => {
  assert.equal(
    needsHumanReview({
      category: "missing-children",
      text: "",
      sourceType: "facebook",
      flags: [],
    }).review,
    true,
  );
  assert.equal(
    needsHumanReview({
      category: "politics",
      text: "মন্ত্রী অভিযুক্ত",
      sourceType: "facebook",
      flags: [],
    }).review,
    true,
  );
  assert.equal(
    needsHumanReview({
      category: "sports",
      text: "A normal match report.",
      sourceType: "news",
      flags: [],
    }).review,
    false,
  );
});

check("a sensitive source stays sensitive after a weak classifier move", () => {
  assert.equal(
    needsHumanReview({
      category: "crime",
      sourceCategory: "child-sexual-abuse",
      text: "সাধারণ অপরাধের খবর",
      sourceType: "news",
      flags: [],
    }).review,
    true,
  );
});

check("legacy descriptors normalise to fixed desks", () => {
  assert.equal(canonicalDesk("accident"), "misc");
  assert.equal(canonicalDesk("tech"), "technology");
  assert.equal(canonicalDesk("research"), "analysis");
});

check("source type is derived from the original URL", () => {
  assert.equal(
    sourceTypeFromUrl("https://www.facebook.com/x/posts/1"),
    "facebook",
  );
  assert.equal(
    sourceTypeFromUrl("https://example.gov.bd/notice"),
    "government",
  );
  assert.equal(
    sourceTypeFromUrl("https://techcrunch.com/2026/01/01/story"),
    "news",
  );
});

check("AI rewrite quality is bounded and damaged by missing Bengali", () => {
  const good = rewriteQuality({
    title_bn: "একটি সম্পূর্ণ বাংলা শিরোনাম যেখানে পর্যাপ্ত তথ্য আছে",
    body_bn: "শব্দ ".repeat(240),
    summary_bn: "সংক্ষিপ্ত সারাংশ যা পাঠককে মূল প্রতিবেদনের বিষয় বুঝিয়ে দেয়।",
    flags: [],
  });
  assert.ok(good > 0.9 && good <= 0.99);
  const bad = rewriteQuality({
    title_bn: "Short",
    body_bn: "few words",
    summary_bn: "",
    flags: ["bengali_script_missing"],
  });
  assert.ok(bad < 0.6);
});

console.log(`[scraper] taxonomy: ${passed} checks passed`);

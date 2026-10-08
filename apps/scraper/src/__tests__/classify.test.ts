import assert from "node:assert/strict";
import { classifyContent } from "../classify";
import { CATEGORY_SEED, GENERAL_CATEGORY_SEED } from "@hoichoi/db";

/**
 * Regression guard for category classification.
 *
 * The classifier is keyword-map-driven and the maps come from the DATABASE
 * (`category_configs.config.keywords`), editable from the web admin AND the
 * desktop desk. This test builds its maps from the seed data itself, so it
 * guards the exact signals a fresh install (and an upgraded existing install,
 * via `ensureCategoryKeywords`) will have.
 */
const SEED_KW: Record<string, string[]> = {};
for (const c of CATEGORY_SEED) {
  const kw = (c.config as { keywords?: string[] }).keywords;
  if (kw?.length) SEED_KW[c.slug] = kw;
}
for (const c of GENERAL_CATEGORY_SEED) {
  if (c.keywords.length) SEED_KW[c.slug] = c.keywords;
}

const ALL = Object.keys(SEED_KW);

const r1 = classifyContent("নিখোঁজ শিশুর সন্ধানে থানায় ব্যবস্থা নেওয়া হয়েছে", ALL, "child-sexual-abuse", SEED_KW);
assert.equal(r1.slug, "missing-children", `expected missing-children, got ${r1.slug}`);
assert.ok(r1.confidence > 0);

const r2 = classifyContent("ছাত্রীকে ধর্ষণের অভিযোগে গ্রেপ্তার", ALL, "missing-children", SEED_KW);
assert.equal(r2.slug, "child-sexual-abuse", `expected child-sexual-abuse, got ${r2.slug}`);

const r3 = classifyContent("স্বামীর প্রেমিকার সাথে ধরা পড়লেন অভিযোগে", ALL, "missing-children", SEED_KW);
assert.equal(r3.slug, "extramarital-crime", `expected extramarital-crime, got ${r3.slug}`);

/** A word must not match inside a longer Bangla word. */
assert.equal(
  classifyContent("অনিখোঁজকারীদের তালিকা", ALL, "child-sexual-abuse", SEED_KW).slug,
  null,
  "substring of a longer word must not match",
);

/** Weak or ambiguous text must defer to the source category. */
assert.equal(
  classifyContent("সকালে খাবার খেয়ে তারপর অফিসে গেলাম", ALL, "extramarital-crime", SEED_KW).slug,
  null,
  "unrelated text must not be reclassified",
);

/** Text already matching its own source category is left alone. */
assert.equal(
  classifyContent("নিখোঁজ শিশু", ALL, "missing-children", SEED_KW).slug,
  null,
  "matching the source category must be a no-op",
);

/** Decomposed (NFD) Bengali input must still match the precomposed keyword. */
assert.equal(
  classifyContent("নিখোঁজ শিশু", ALL, "child-sexual-abuse", SEED_KW).slug,
  "missing-children",
  "NFC normalisation should make decomposed input match",
);

/** An empty candidate list must not throw. */
assert.equal(classifyContent("নিখোঁজ শিশু", [], "missing-children", SEED_KW).slug, null);

/**
 * General (non-special) categories participate via their seeded keywords. A
 * helping post under the old extramarital frame must be re-filed.
 */
assert.equal(
  classifyContent(
    "গ্রামে খাবার বিতরণ করলো স্বেচ্ছাসেবীরা, শতাধিক পরিবার পেল ত্রাণ",
    ALL,
    "extramarital-crime",
    SEED_KW,
  ).slug,
  "helping-others",
  "a helping/relief post must be re-filed to helping-others",
);
assert.equal(
  classifyContent("হাসপাতালে জরুরি বিভাগে ডাক্তার চিকিৎসা দিলেন রোগীকে", ALL, "extramarital-crime", SEED_KW).slug,
  "health",
  "a health post must be re-filed to health",
);

/** Admin-tuned keyword maps drive custom categories: empty list stays quiet. */
const CUSTOM = [...ALL, "transparency"];
assert.equal(
  classifyContent("সহজিয়ারা রাখার নির্দেশনা", CUSTOM, "extramarital-crime", {
    ...SEED_KW,
    transparency: [],
  }).slug,
  null,
  "a category with no keywords never matches on its own",
);
assert.equal(
  classifyContent("সহজিয়ারা রাখার নির্দেশনা", CUSTOM, "extramarital-crime", {
    ...SEED_KW,
    transparency: ["সহজিয়া", "নির্দেশনা"],
  }).slug,
  "transparency",
  "the admin keyword list supplies the signal for a custom category",
);

console.log("[test] 12 classification checks passed");

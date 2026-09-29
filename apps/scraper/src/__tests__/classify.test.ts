import assert from "node:assert/strict";
import { classifyContent } from "../classify";

/**
 * Regression guard for category classification.
 *
 * Two terms used ASCII `\b` word boundaries — `\bনিখোঁজ\b` and `\bখুন\b`.
 * JavaScript's `\b`/`\w` are ASCII-only and Bangla codepoints are not `\w`,
 * so those patterns could never match. "নিখোঁজ" is the single strongest
 * missing-children signal, so its loss is a large part of why posts were
 * filed under the wrong section.
 */
const ALL = ["child-sexual-abuse", "extramarital-crime", "missing-children"];

const r1 = classifyContent("নিখোঁজ শিশুর সন্ধানে থানায় ব্যবস্থা নেওয়া হয়েছে", ALL, "child-sexual-abuse");
assert.equal(r1.slug, "missing-children", `expected missing-children, got ${r1.slug}`);
assert.ok(r1.confidence > 0);

const r2 = classifyContent("ছাত্রীকে ধর্ষণের অভিযোগে গ্রেপ্তার", ALL, "missing-children");
assert.equal(r2.slug, "child-sexual-abuse", `expected child-sexual-abuse, got ${r2.slug}`);

const r3 = classifyContent("স্বামীর প্রেমিকার সাথে ধরা পড়লেন অভিযোগে", ALL, "missing-children");
assert.equal(r3.slug, "extramarital-crime", `expected extramarital-crime, got ${r3.slug}`);

/** A word must not match inside a longer Bangla word. */
assert.equal(
  classifyContent("অনিখোঁজকারীদের তালিকা", ALL, "child-sexual-abuse").slug,
  null,
  "substring of a longer word must not match",
);

/** Weak or ambiguous text must defer to the source category. */
assert.equal(
  classifyContent("আজ সকালে সরকার নতুন নীতিমালা ঘোষণা করেছে", ALL, "extramarital-crime").slug,
  null,
  "unrelated text must not be reclassified",
);

/** Text already matching its own source category is left alone. */
assert.equal(
  classifyContent("নিখোঁজ শিশু", ALL, "missing-children").slug,
  null,
  "matching the source category must be a no-op",
);

/** Decomposed (NFD) Bengali input must still match the precomposed keyword. */
assert.equal(
  classifyContent("নিখোঁজ শিশু", ALL, "child-sexual-abuse").slug,
  "missing-children",
  "NFC normalisation should make decomposed input match",
);

/** An empty candidate list must not throw. */
assert.equal(classifyContent("নিখোঁজ শিশু", [], "missing-children").slug, null);

console.log("[test] 8 classification checks passed");

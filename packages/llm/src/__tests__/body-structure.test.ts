import assert from "node:assert/strict";
import { parseRewriteOutput } from "../types";

/**
 * End-to-end guard for the "short article" bug.
 *
 * The old parser cut the BODY at the first newline, so a model that correctly
 * followed the multi-paragraph structure lost everything after the first line.
 * Even with parsing fixed, the body must actually reach the site as separate
 * paragraphs. These tests pin both halves of that chain.
 */

/** A realistic model response that follows the multi-paragraph BODY contract. */
const modelOutput = `TITLE: পুলিশের অভিযোগে বড় থানায় নিখোঁজ শিশুর সন্ধান
SUMMARY: প্রাথমিক তথ্য অনুযায়ী, শিশুটির সন্ধানে পুলিশ তদন্ত চালাচ্ছে।
BODY: প্রাথমিক তথ্য অনুযায়ী, বড় থানা এলাকায় একটি শিশুর সন্ধান নিয়ে তদন্ত শুরু হয়েছে।
পুলিশ জানিয়েছে, শিশুটির বয়স আনুমানিক সাত বছর এবং সে নির্দিষ্ট সময়ে বাড়ি থেকে বের হয়েছিল।

গবেষণার পর কয়েকটি এলাকায় খোঁজ নেওয়া হয়েছে। স্থানীয়রা জানিয়েছেন, শিশুটি স্থানীয় একটি স্কুলে পড়তো।

বর্তমানে পুলিশ সিসিটিভি ফুটেজ পর্যালোচনা করছে এবং আশপাশের বাসিন্দাদের সাথে কথা বলছে। স্বজনদের সক্ষেপে কোনো পরিচিত ব্যক্তির সঙ্গে শেষ দেখা হয়েছে বলে জানানো হয়েছে।

যারা শিশুটির সন্ধানের তথ্য জানেন, তাদের নিকটস্থ থানায় যোগাযোগ করতে অনুরোধ করা হচ্ছে। জাতীয় শিশু হেল্পলাইন ১০৯-এও জানানো যায়।

SAFETY_FLAG: none
CASE_STATUS: active`;

/** The parser must keep every BODY paragraph, not just the first line. */
const parsed = parseRewriteOutput(modelOutput);

assert.equal(parsed.title_bn, "পুলিশের অভিযোগে বড় থানায় নিখোঁজ শিশুর সন্ধান");
assert.ok(parsed.summary_bn.includes("তদন্ত"), "summary parsed");
assert.ok(parsed.body_bn.length > 400, `body should be substantial, got ${parsed.body_bn.length} chars`);
assert.ok(!parsed.title_bn.includes("শিরোনাম ছাড়া"), "no placeholder title injected");
assert.equal(parsed.safety_flag, "none");

/** The body must contain all five source paragraphs. */
for (const fragment of [
  "বের হয়েছিল",
  "স্কুলে পড়তো",
  "সিসিটিভি ফুটেজ",
  "যোগাযোগ করতে অনুরোধ",
  "১০৯",
]) {
  assert.ok(parsed.body_bn.includes(fragment), `body lost "${fragment}"`);
}

/**
 * The site's own paragraphizer (mirrored here, see post/[slug]/page.tsx) must
 * split the body on blank lines. This is the assertion that the truncation
 * bug is not silently reintroduced upstream.
 */
const blankLineSplit = parsed.body_bn
  .split(/\n\s*\n/)
  .map((p) => p.replace(/\s+/g, " ").trim())
  .filter(Boolean);
assert.ok(
  blankLineSplit.length >= 4,
  `body should split into >=4 paragraphs, got ${blankLineSplit.length}`,
);

/**
 * A model that hard-wraps every line (no blank lines) must still render as
 * multiple paragraphs rather than one block, so the fallback split engages.
 */
const hardWrapped = parseRewriteOutput(
  `TITLE: শিরোনাম
SUMMARY: সারাংশ।
BODY: প্রথম লাইন এখানে শেষ।
দ্বিতীয় লাইন এখানে শেষ।
তৃতীয় লাইন এখানে শেষ।
SAFETY_FLAG: none`,
).body_bn;
const singleLineBlocks = hardWrapped.split(/\n\s*\n/).filter(Boolean);
const fallbackBlocks =
  singleLineBlocks.length > 1 ? singleLineBlocks : hardWrapped.split(/\n/).map((p) => p.trim()).filter(Boolean);
assert.ok(fallbackBlocks.length >= 3, `hard-wrapped body should split, got ${fallbackBlocks.length}`);

console.log("[test] article body / paragraph checks passed");

/**
 * The republication gate.
 *
 * Aggregation is legal when we summarise and quote briefly. A fluent rewrite that
 * lifts a paragraph is a copyright problem that reads like our own prose, so the
 * detector has to be exact on the two cases that matter: a long verbatim run must
 * be caught, and a genuine summary must sail through.
 */
import assert from "node:assert/strict";
import { checkRepublication, copiedShare, longestVerbatimRun, tokenize } from "../source-overlap";

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const SOURCE = `পুলিশ জানিয়েছে, শুক্রবার বিকেলে বরিশালের একটি বাজারে দুই পক্ষের মধ্যে争执 শুরু হয়।
স্থানীয়রা জানান, ঘটনার সময় বাজারে শতাধিক মানুষ উপস্থিত ছিলেন এবং পরিস্থিতি দ্রুত
নিয়ন্ত্রণের বাইরে চলে যায়। পরে পুলিশ গিয়ে পরিস্থিতি নিয়ন্ত্রণে আনে এবং তিনজনকে আটক করে।`;

check("a genuine summary shares almost nothing", () => {
  const rewrite = `বরিশালে শুক্রবার বিকেলে একটি বাজারে সংঘর্ষের ঘটনা ঘটেছে। পুলিশ তিনজনকে আটক করেছে এবং পরিস্থিতি নিয়ন্ত্রণে এনেছে।`;
  const report = checkRepublication(SOURCE, rewrite);
  assert.equal(report.exceedsLimit, false, `longest run ${report.longestRun} should be short`);
});

check("a lifted paragraph is refused at a tight limit", () => {
  const rewrite = `ভূমিকা আলাদা। পুলিশ জানিয়েছে, শুক্রবার বিকেলে বরিশালের একটি বাজারে দুই পক্ষের মধ্যে争执 শুরু হয়। স্থানীয়রা জানান, ঘটনার সময় বাজারে শতাধিক মানুষ উপস্থিত ছিলেন এবং পরিস্থিতি দ্রুত নিয়ন্ত্রণের বাইরে চলে যায়।`;
  const report = checkRepublication(SOURCE, rewrite, 20);
  assert.equal(report.exceedsLimit, true);
  assert.ok(report.longestRun > 20, `expected a long run, got ${report.longestRun}`);
  assert.ok(report.sample.length > 0, "the log sample must show the copied words");
});

check("the default 35-word ceiling catches a copied paragraph", () => {
  const sentence = Array.from({ length: 44 }, (_, i) => `শব্দ${i}`).join(" ");
  const report = checkRepublication(`আগে ${sentence} পরে`, `শুরু ${sentence} শেষ`);
  assert.equal(report.longestRun, 44);
  assert.equal(report.limit, 35);
  assert.equal(report.exceedsLimit, true);
});

check("the limit is honoured as a strict ceiling", () => {
  const words = Array.from({ length: 10 }, (_, i) => `শব্দ${i}`).join(" ");
  assert.equal(checkRepublication(`x ${words} y`, `a ${words} b`, 10).exceedsLimit, false);
  assert.equal(checkRepublication(`x ${words} y`, `a ${words} b`, 9).exceedsLimit, true);
});

check("punctuation and case do not hide a copy", () => {
  const src = "The police said, \"Three men were arrested at the market on Friday.\"";
  const rewrite = "THE POLICE SAID “THREE MEN WERE ARRESTED AT THE MARKET ON FRIDAY”";
  assert.ok(longestVerbatimRun(src, rewrite).run >= 9);
});

check("empty inputs cannot crash or claim a copy", () => {
  assert.equal(longestVerbatimRun("", "কিছু লেখা").run, 0);
  assert.equal(longestVerbatimRun(SOURCE, "").run, 0);
  assert.equal(checkRepublication("", "").exceedsLimit, false);
});

check("tokenize drops punctuation and zero-width marks only", () => {
  assert.deepEqual(tokenize("  হঠাৎ,  শব্দ। "), ["হঠাৎ", "শব্দ"]);
  assert.deepEqual(tokenize("a\u200bb c"), ["ab", "c"]);
});

check("copiedShare flags a rearranged but fully copied story", () => {
  const share = copiedShare(SOURCE, SOURCE.split("\n").reverse().join(" "));
  assert.ok(share > 0.9, `expected near-total overlap, got ${share.toFixed(2)}`);
  const real = copiedShare(SOURCE, "সম্পূর্ণ নতুন ভাষায় লেখা একটি সারসংক্ষেপ, যেখানে কোনো বাক্য নেওয়া হয়নি।");
  assert.ok(real < 0.6, `expected low overlap for a summary, got ${real.toFixed(2)}`);
});

console.log(`[scraper] source-overlap: ${passed} checks passed`);

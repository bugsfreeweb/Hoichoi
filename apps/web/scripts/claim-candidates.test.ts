/**
 * Claim proposals are a reading of the text, not a model's opinion.
 * ---------------------------------------------------------------------------
 * The verification grade is derived from rows (`gradeFromEvidence`), and the rows
 * only exist if an editor writes them — which almost nobody did, because the box
 * was blank. The shortcut would be "ask a model to extract the claims": a
 * proposal that cannot be re-run, cannot be audited, and carries the story's
 * names to a third party a second time.
 *
 * So extraction is deterministic. This file pins the four properties that make it
 * usable instead of annoying:
 *
 *   1. it offers sentences that can be true or false, and skips the rest
 *      (questions, appeals, speculation);
 *   2. rank follows evidence surface — a figure and a named party beat a mood;
 *   3. the same input twice gives the same output, and near-duplicates collapse;
 *   4. nothing is written: a candidate becomes a claim only when a human keeps it.
 *
 * Run: npx tsx scripts/claim-candidates.test.ts
 */
import assert from "node:assert/strict";
import {
  extractClaimCandidates,
  foldDigits,
  splitSentences,
} from "@hoichoi/shared-types";

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

const BODY = [
  "জেলার প্রশাসন জানিয়েছে, গত মঙ্গলবার রাতে উপজেলার তিনটি গ্রামে বিদ্যুৎ বিচ্ছিন্ন ছিল।",
  "ক্ষতির পরিমাণ প্রায় ২ কোটি ৪০ লাখ টাকা বলে জানিয়েছেন স্থানীয় চেয়ারম্যান।",
  "আপনি কী মনে করেন?",
  "এটি হতে পারে একটি বড় সমস্যার শুরু।",
  "পুলিশ জানিয়েছে, ঘটনায় দুটি মামলা হয়েছে এবং একজনকে গ্রেফতার করা হয়েছে।",
  "ভিডিওটি দেখুন এবং শেয়ার করুন।",
].join("\n");

check("sentences are split on Bangla and English terminators", () => {
  assert.deepEqual(splitSentences("এক। দুই? তিন! চার\nপাঁচ"), [
    "এক।",
    "দুই?",
    "তিন!",
    "চার",
    "পাঁচ",
  ]);
});

check("a question is not a claim", () => {
  const texts = extractClaimCandidates(BODY).map((c) => c.text);
  assert.ok(
    !texts.some((t) => t.includes("মনে করেন")),
    "a question must not be offered",
  );
});

check("an appeal to share is not a claim", () => {
  const texts = extractClaimCandidates(BODY).map((c) => c.text);
  assert.ok(!texts.some((t) => t.includes("শেয়ার করুন")));
});

check("speculation is offered only if it also carries evidence", () => {
  const texts = extractClaimCandidates(BODY).map((c) => c.text);
  assert.ok(!texts.some((t) => t.startsWith("এটি হতে পারে")));
});

check(
  "a sentence with a figure and a sum is ranked first, as a figure claim",
  () => {
    const [top] = extractClaimCandidates(BODY);
    assert.ok(top, "at least one candidate");
    assert.equal(top!.kind, "figure");
    assert.match(top!.text, /টাকা/);
    assert.match(top!.reason, /সংখ্যা আছে/);
  },
);

check(
  "a named party and a case is offered, ranked above a plain statement",
  () => {
    const list = extractClaimCandidates(BODY);
    const police = list.find((c) => c.text.includes("মামলা হয়েছে"));
    assert.ok(police, "the police statement must be offered");
    assert.equal(police!.kind, "statement");
    assert.match(police!.reason, /নামকরা পক্ষ|সংখ্যা/);
  },
);

check("a quotation is classified as a quote", () => {
  const list = extractClaimCandidates(
    "মন্ত্রী বলেছেন, “আমরা সবাই মিলে কাজ করব।” তিনি আরও বলেছেন বিস্তারিত পরে।",
  );
  const quoted = list.find((c) => c.kind === "quote");
  assert.ok(quoted, "a quoted sentence must be typed as a quote");
});

check("the same text twice gives the same list", () => {
  const a = extractClaimCandidates(BODY);
  const b = extractClaimCandidates(BODY);
  assert.deepEqual(a, b);
});

check("near-duplicates collapse, across digit sets", () => {
  const twice =
    "ক্ষতির পরিমাণ ২ কোটি ৪০ লাখ টাকা।\nক্ষতির পরিমাণ 2 কোটি 40 লাখ টাকা।";
  assert.equal(
    extractClaimCandidates(twice).length,
    1,
    "Bengali and ASCII digits are the same claim",
  );
  assert.equal(foldDigits("২৪০ টাকা"), "240 টাকা");
});

check("a fragment shorter than a sentence is not offered", () => {
  assert.deepEqual(extractClaimCandidates("সংখ্যা ৫।"), []);
});

check("one oversized paragraph is cut at a clause, not mid-word", () => {
  const long = `${"প্রশাসন জানিয়েছে যে পরিস্থিতি নিয়ন্ত্রণে আছে এবং".repeat(10)} ক্ষতির পরিমাণ ৯ লাখ টাকা`;
  const [first] = extractClaimCandidates(long);
  assert.ok(first, "the paragraph must still yield a candidate");
  assert.ok(first!.text.length <= 240 + 1);
  assert.ok(!/\s$/.test(first!.text), "no trailing space");
});

check("the list is capped", () => {
  const many = Array.from(
    { length: 20 },
    (_, i) => `ঘটনায় ${i + 1} নম্বর মামলা হয়েছে এবং পুলিশ জানিয়েছে।`,
  );
  assert.equal(extractClaimCandidates(many.join(" ")).length, 8);
  assert.equal(extractClaimCandidates(many.join(" "), { max: 3 }).length, 3);
});

check("an empty body offers nothing at all", () => {
  assert.deepEqual(extractClaimCandidates(""), []);
  assert.deepEqual(extractClaimCandidates("   \n\n  "), []);
});

check("no candidate carries a confidence score to mistake for evidence", () => {
  for (const candidate of extractClaimCandidates(BODY)) {
    assert.deepEqual(Object.keys(candidate).sort(), ["kind", "reason", "text"]);
  }
});

console.log(`\nclaim candidates: ${passed} checks passed`);

import assert from "node:assert/strict";
import { isBengaliScript, parseRewriteOutput } from "../types";

/**
 * Regression guard for the strict-output parser.
 *
 * The original terminator was `(?=^[A-Z_]+:|\s*$)`. Under the `m` flag `\s*$`
 * matches at EVERY line end, not just end-of-string, so the lazy capture for
 * BODY stopped at the first newline. Every multi-paragraph article was
 * silently reduced to its opening paragraph, which is why published posts read
 * as a one-line brief instead of an article.
 */
const raw = [
  "TITLE: নিখোঁজ শিশুর অভিযোগে আদালতের রায়",
  "SUMMARY: একটি সংক্ষিপ্ত বিবরণ।",
  "BODY: প্রথম অনুচ্ছেদ এখানে আছে।",
  "",
  "দ্বিতীয় অনুচ্ছেদটি এখানে আছে এবং এতে আরও বিস্তারিত ব্যাখ্যা রয়েছে।",
  "",
  "তৃতীয় অনুচ্ছেদটি উপসংহার হিসেবে কাজ করে।",
  "SAFETY_FLAG: minor_involved",
  "CASE_STATUS: active",
].join("\n");

const out = parseRewriteOutput(raw);
const paragraphs = out.body_bn.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

assert.equal(paragraphs.length, 3, `expected 3 paragraphs, got ${paragraphs.length}`);
assert.match(out.body_bn, /তৃতীয় অনুচ্ছেদ/);
assert.equal(out.title_bn, "নিখোঁজ শিশুর অভিযোগে আদালতের রায়");
assert.equal(out.summary_bn, "একটি সংক্ষিপ্ত বিবরণ।");
assert.equal(out.safety_flag, "minor_involved");
assert.equal(out.case_status, "active");

/** A single-line body with no trailing label must survive intact. */
const flat = parseRewriteOutput("TITLE: এক লাইনের লেখা\nSUMMARY: সারাংশ\nBODY: শুধু একটি বাক্য।");
assert.equal(flat.body_bn, "শুধু একটি বাক্য।");
assert.equal(flat.safety_flag, "none");

/** A body must stop at the next real label, not before it. */
const labelled = parseRewriteOutput(
  ["TITLE: শিরোনাম", "BODY: প্রথম লাইন।", "দ্বিতীয় লাইন।", "NOTE: এটা BODY নয়"].join("\n"),
);
assert.match(labelled.body_bn, /দ্বিতীয় লাইন।/);
assert.doesNotMatch(labelled.body_bn, /এটা BODY নয়/);

/**
 * A missing title must stay empty so the caller can reject the post. It used to
 * be back-filled with the "শিরোনাম ছাড়া" placeholder, which is exactly the
 * content the desk is supposed to reject instead of storing.
 */
const titleless = parseRewriteOutput("SUMMARY: শুধু সারাংশ\nBODY: শরীর।");
assert.equal(titleless.title_bn, "", "title must stay empty so the post can be rejected");

assert.ok(isBengaliScript("আজ সকালে নিখোঁজ শিশুর খোঁজা শুরু হয়েছে।"));
assert.ok(!isBengaliScript("This is plain english text that should fail"));

/** A ``` fence around the answer and a preamble before the labels must not hide fields. */
const fenced = [
  "```",
  "নিচে একটি বিশদ প্রতিবেদন দেয়া হলো:",
  "",
  "TITLE: বিজ্ঞপ্তি",
  "SUMMARY: সারাংশের লেখা।",
  "BODY: প্রথম লাইন।",
  "",
  "দ্বিতীয় লাইন।",
  "SAFETY_FLAG: graphic",
  "CASE_STATUS: false alarm",
  "```",
].join("\n");
const fen = parseRewriteOutput(fenced);
assert.equal(fen.title_bn, "বিজ্ঞপ্তি", "heading must survive the fence and preamble");
assert.match(fen.body_bn, /দ্বিতীয় লাইন।/);
assert.equal(fen.safety_flag, "graphic_content", "shorthand 'graphic' must map to graphic_content");
assert.equal(fen.case_status, "false-alarm", "spaced 'false alarm' must map to false-alarm");

/** Bold, bulleted, and spaced labels are all accepted. */
const styled = parseRewriteOutput(
  ["- **TITLE:** বোল্ড শিরোনাম", "SAFETY FLAG: minor_involved", "Case status: active"].join("\n"),
);
assert.equal(styled.title_bn, "বোল্ড শিরোনাম");
assert.equal(styled.safety_flag, "minor_involved");
assert.equal(styled.case_status, "active");

/** Bangla aliases replace the canonical labels without losing sections. */
const bangla = parseRewriteOutput(
  ["শিরোনাম: বাংলা শিরোনাম", "সারাংশ: এক লাইনের সারসংক্ষেপ।", "মূল অংশ: বিস্তারিত লেখা এখানে।"].join("\n"),
);
assert.equal(bangla.title_bn, "বাংলা শিরোনাম");
assert.equal(bangla.summary_bn, "এক লাইনের সারসংক্ষেপ।");
assert.match(bangla.body_bn, /বিস্তারিত লেখা/);

/** A colon-less label followed by its value on the next line still works. */
const nextLine = parseRewriteOutput("TITLE\nশিরোনাম পরের লাইনে\nBODY:\nশরীর।");
assert.equal(nextLine.title_bn, "শিরোনাম পরের লাইনে");
assert.equal(nextLine.body_bn, "শরীর।");

console.log("[test] 10 parser checks passed");

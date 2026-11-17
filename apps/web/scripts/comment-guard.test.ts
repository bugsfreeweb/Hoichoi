/**
 * Comment abuse rules: narrow enough to keep real readers, sharp enough to stop
 * a three-link advert or a padding block from reaching the queue.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assessCommentBody, COMMENT_LIMITS, linkCount } from "../src/lib/comment-guard";

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

check("an ordinary reply passes", () => {
  assert.equal(assessCommentBody("খবরটি খুব কাজে লাগল, ধন্যবাদ।").ok, true);
});

check("emphasis and repetition under the limit pass", () => {
  assert.equal(assessCommentBody("সত্যিই!!!! ভালো লাগল").ok, true);
  assert.equal(assessCommentBody("অনেক " + "অ".repeat(COMMENT_LIMITS.maxSameCharRun)).ok, true);
});

check("one or two links are allowed", () => {
  assert.equal(assessCommentBody("দেখুন https://example.com/a").ok, true);
  assert.equal(
    assessCommentBody("সূত্র: https://example.com/a এবং https://example.org/b").ok,
    true,
  );
});

check("three links are refused as an advert", () => {
  const v = assessCommentBody("https://a.example https://b.example https://c.example — দেখুন");
  assert.equal(v.ok, false);
  assert.equal(v.signal, "links");
});

check("a bare domain counts as a link", () => {
  assert.equal(linkCount("sutki.xyz আর notun.shop আর third.link"), 3);
  assert.equal(assessCommentBody("a.xyz b.shop c.link").signal, "links");
});

check("a run of one character is refused", () => {
  const v = assessCommentBody("হা" + "হ".repeat(COMMENT_LIMITS.maxSameCharRun + 2));
  assert.equal(v.ok, false);
  assert.equal(v.signal, "padding");
});

check("more than two phone numbers is refused (PII/scam)", () => {
  const v = assessCommentBody("কল করুন 01712345678, 01812345678, 01912345678");
  assert.equal(v.ok, false);
  assert.equal(v.signal, "numbers");
});

check("Bangla digits in a price are not treated as phone spam", () => {
  assert.equal(assessCommentBody("দাম ২৫০ টাকা, ধন্যবাদ।").ok, true);
});

check("an empty body is refused, not stored", () => {
  assert.equal(assessCommentBody("   ").ok, false);
});

check("every refusal carries a Bangla reason a reader can act on", () => {
  for (const body of ["a.xyz b.shop c.link", "হা" + "হ".repeat(20), "01712345678 01812345678 01912345678"]) {
    const v = assessCommentBody(body);
    assert.equal(v.ok, false);
    assert.ok(v.reason && v.reason.length > 10, `short reason for ${body.slice(0, 10)}`);
    assert.match(v.reason!, /।/);
  }
});

check("the route calls the guard before storing", () => {
  const route = fs.readFileSync(path.resolve(import.meta.dirname, "../src/app/api/comments/route.ts"), "utf8");
  const guardAt = route.indexOf("assessCommentBody(bodyStr)");
  const insertAt = route.indexOf("createComment({");
  assert.ok(guardAt !== -1 && insertAt !== -1);
  assert.ok(guardAt < insertAt, "the guard must run before the insert");
});

console.log(`\n${passed} comment-guard checks passed.`);

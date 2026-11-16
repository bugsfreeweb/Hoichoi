import assert from "node:assert/strict";
import { redactPii, redactFields } from "../pii";

/**
 * PII redaction runs before any text leaves for a cloud model, and again on what
 * comes back. These checks pin the cases a reader's tip actually contains, and
 * the cases that must be left alone (a date, a price, a year).
 */

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

check("email is removed and counted", () => {
  const r = redactPii("যোগাযোগ: ratul@example.com বরাবর");
  assert.equal(r.counts.email, 1);
  assert.ok(!r.text.includes("ratul@example.com"));
  assert.ok(r.flagged);
});

check("Bangla mobile with +88 and separators is removed", () => {
  const r = redactPii("ফোন করুন +880 1712-345678 নম্বরে");
  assert.ok(!r.text.includes("1712"));
  assert.equal(r.counts.phone + r.counts.longDigits >= 1, true);
});

check("plain local mobile is removed and labelled a phone", () => {
  const r = redactPii("আমার নম্বর 01712345678");
  assert.ok(!r.text.includes("01712345678"));
  assert.equal(r.counts.phone, 1);
  assert.ok(r.flagged);
});

check("a 16-digit card run is reported as card-like", () => {
  const r = redactPii("কার্ড 4111 1111 1111 1111 দিয়ে");
  assert.equal(r.counts.cardLike, 1);
  assert.ok(!r.text.includes("4111"));
});

check("prices, years and small numbers survive", () => {
  const input = "২০২৪ সালে দাম বাড়ল ৫০,০০০ টাকা, ঘোষণা ১২ মার্চ";
  const r = redactPii(input);
  assert.equal(r.text, input);
  assert.equal(r.flagged, false);
});

check("a 4-digit year is never treated as PII", () => {
  const r = redactPii("ঘটনাটি 2019 সালের, রিপোর্ট 2024-05-11 তারিখের");
  assert.equal(r.text, "ঘটনাটি 2019 সালের, রিপোর্ট 2024-05-11 তারিখের");
});

check("NID-length digit run is removed", () => {
  const r = redactPii("এনআইডি 1990123456789 যাচাই হয়েছে");
  assert.ok(!r.text.includes("1990123456789"));
  assert.equal(r.counts.longDigits >= 1, true);
});

check("empty input stays empty and unflagged", () => {
  const r = redactPii("");
  assert.equal(r.text, "");
  assert.equal(r.flagged, false);
});

check("multiple fields are redacted in one pass and counts merge", () => {
  const r = redactFields({ title: "যোগাযোগ a@b.com", body: "ফোন 01712345678" });
  assert.ok(!(r.fields.title ?? "").includes("a@b.com"));
  assert.ok(!(r.fields.body ?? "").includes("01712345678"));
  assert.equal(r.counts.email, 1);
  assert.ok(r.counts.phone + r.counts.longDigits >= 1);
  assert.ok(r.flagged);
});

check("redaction marker is Bangla and visible to a human", () => {
  const r = redactPii("মেইল reader@example.org");
  assert.ok(r.text.includes("সরানো হয়েছে"));
});

console.log(`\n${passed} PII redaction checks passed.`);
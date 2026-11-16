import assert from "node:assert/strict";
import { assessDisplayName } from "../src/lib/name-guard";

/**
 * The display-name guard on the anonymous forms.
 *
 * It has to stop the two things a name field reliably attracts — impersonating
 * the publication and smuggling a link — without rejecting ordinary Bangla names,
 * which are short, sometimes one word, and sometimes contain a title like "মিয়া".
 */

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

check("an ordinary Bangla name passes", () => {
  assert.equal(assessDisplayName("রফিকুল ইসলাম").ok, true);
});

check("a single short word passes", () => {
  assert.equal(assessDisplayName("অনু").ok, true);
});

check("one-character name is refused", () => {
  const r = assessDisplayName("ক");
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

check("a URL in the name is refused", () => {
  assert.equal(assessDisplayName("ভালো অফার www.cheap-bd.com").ok, false);
  assert.equal(assessDisplayName("telegram এ যোগ দিন").ok, false);
});

check("impersonating the desk is refused", () => {
  assert.equal(assessDisplayName("হৈচৈ সম্পাদক").ok, false);
  assert.equal(assessDisplayName("Hoichoi Admin").ok, false);
  assert.equal(assessDisplayName("মডারেটর").ok, false);
});

check("impersonating an official is refused", () => {
  assert.equal(assessDisplayName("পুলিশ কর্মকর্তা").ok, false);
  assert.equal(assessDisplayName("র্যাব সদস্য").ok, false);
});

check("zero-width padding around a reserved name is refused", () => {
  assert.equal(assessDisplayName("হৈচৈ\u200B সম্পাদক").ok, false);
});

check("a wall of one repeated character is refused", () => {
  assert.equal(assessDisplayName("aaaaaaaa").ok, false);
});

check("over-long name is refused with a reason", () => {
  const r = assessDisplayName("ক".repeat(61));
  assert.equal(r.ok, false);
  assert.ok(r.reason && r.reason.length > 0);
});

check("a plain commenter name that merely contains a common word still passes", () => {
  assert.equal(assessDisplayName("সম্পাদকিয় প্রেমিক").ok, true);
});

console.log(`\n${passed} display-name checks passed.`);
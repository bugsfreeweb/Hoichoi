/**
 * Bulk moderation must clear a backlog without becoming a bypass.
 *
 * The queue is worked one card at a time today, which is why it stays a queue.
 * A bulk approve is only acceptable if it keeps every promise the single-card
 * action made, so these checks pin the three that could quietly disappear:
 *
 *   1. bulk never publishes — approve moves a draft out of `pending_review` and
 *      nothing more;
 *   2. a desk that needs a second signature is skipped, not folded in;
 *   3. every post in a batch gets its own audit row, so the log answers "who
 *      approved these twenty" with twenty rows instead of one summary.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => fs.readFileSync(path.join(APP, rel), "utf8");

/** Comments are stripped first: a comment may promise behaviour the code lacks. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ok ${name}`);
}

const route = code(read("src/app/api/moderation/bulk/route.ts"));
const page = code(read("src/app/admin/(console)/moderation/page.tsx"));
const grid = code(read("src/components/admin/ModerationGrid.tsx"));
const card = code(read("src/components/admin/ModerationCard.tsx"));

check("the batch endpoint asks for a moderator, not a guest", () => {
  assert.match(route, /requireApiRole\("moderator"\)/);
});

check("bulk approve is not bulk publish", () => {
  // The only accepted actions are the two reversible ones.
  assert.match(route, /action !== "approve" && action !== "reject"/);
  assert.ok(
    !/UPDATE posts SET status = 'published'/.test(route),
    "a batch must never move a post to published",
  );
  assert.match(route, /SET status = 'approved'/, "approve sets approved");
  assert.match(route, /SET status = 'rejected'/, "reject sets rejected");
});

check("a second-signature desk is skipped and says why", () => {
  assert.match(route, /requires_double_approval/, "the category config is consulted");
  assert.match(route, /skipped\.push\(\{ id, reason: "দ্বিতীয় অনুমোদন প্রয়োজন/, "the skip carries a Bangla reason");
  // The UI must not offer the checkbox for those posts either.
  assert.match(page, /requires_double_approval/);
  assert.match(page, /lockedIds/);
  assert.match(grid, /locked\.has\(p\.id\)/);
  assert.match(card, /disabled=\{locked \|\| !onSelect\}/);
});

check("a post is only approved from pending_review", () => {
  // Approving a rejected or already-published post from a checkbox would be an
  // edit nobody asked for, so the status is checked per post.
  assert.match(route, /if \(post\.status !== "pending_review"\)/);
  assert.match(route, /skipped\.push\(\{ id, reason: `অবস্থা \$\{post\.status\}/);
});

check("every post in a batch gets its own audit row", () => {
  // Two calls, one per branch, each inside the loop — not one summary after it.
  const approveAudits = route.match(/action: "moderation\.approve"/g) ?? [];
  const rejectAudits = route.match(/action: "moderation\.reject"/g) ?? [];
  assert.equal(approveAudits.length, 1);
  assert.equal(rejectAudits.length, 1);
  assert.match(route, /metadata: \{ bulk: true/, "the row records that it came from a batch");
  const loop = route.slice(
    route.indexOf("for (const id of ids)"),
    route.lastIndexOf("return NextResponse.json({"),
  );
  assert.ok(loop.includes("await audit("), "the audit is inside the per-post loop");
});

check("a batch is bounded and de-duplicated", () => {
  assert.match(route, /const MAX_IDS = 100/);
  assert.match(route, /if \(ids\.length > MAX_IDS\)/);
  assert.match(route, /new Set\(body\.ids\.filter/);
});

check("the result is reported per post, not as a guess", () => {
  assert.match(route, /approved: approved\.length/);
  assert.match(route, /skipped,/);
  assert.match(route, /failed,/);
  // The grid shows what happened instead of reloading silently.
  assert.match(grid, /skipped\?\.length/);
  assert.match(grid, /failed\?\.length/);
});

check("both card views are six across", () => {
  // Six per row is what was asked for; it is written once in each grid so a
  // later tidy cannot silently halve the density of one page only.
  for (const [name, src] of [
    ["moderation grid", grid],
    ["post editor", code(read("src/app/admin/(console)/posts/page.tsx"))],
  ] as const) {
    assert.match(src, /2xl:grid-cols-6/, `${name} is six up on a wide screen`);
    assert.match(src, /grid-cols-2/, `${name} starts two up on a phone`);
  }
});

console.log(`\n[web] moderation bulk: ${passed} checks passed`);

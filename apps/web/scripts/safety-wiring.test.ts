import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Wiring checks for the safety controls added in this batch.
 *
 * Each of these has a pure, unit-tested implementation; what could silently rot
 * is the *call site* — a guard that exists but is never invoked protects nothing.
 * So this file asserts the calls are actually there, in the right order.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

check("the pipeline refuses to run while collection is paused", () => {
  const src = read("apps/scraper/src/pipeline.ts");
  assert.ok(src.includes("collection_paused"), "pipeline must read the pause flag");
  // The check must come before the first scrape, not after the work is done.
  const pauseAt = src.indexOf("collection_paused");
  const scrapeAt = src.indexOf("scrapeSource");
  assert.ok(scrapeAt === -1 || pauseAt < scrapeAt, "pause check must precede scraping");
  assert.ok(src.includes("pipeline.paused"), "a paused run must be logged as such");
});

check("a paused run is closed as failed, with the reason", () => {
  const src = read("apps/scraper/src/pipeline.ts");
  assert.ok(src.includes("status = 'failed'"), "paused runs must not look successful");
  assert.ok(src.includes("কলেকশন বিরতিতে"), "the recorded reason must be human-readable");
});

check("the AI gateway redacts PII before calling the provider", () => {
  const src = read("apps/web/src/lib/ai-task.ts");
  const redactAt = src.indexOf("redactFields({ rawText: input.text })");
  // lastIndexOf: the JSDoc above also names the method.
  const callAt = src.lastIndexOf("provider.rewrite(");
  assert.ok(redactAt !== -1, "the gateway must redact the request text");
  assert.ok(callAt !== -1 && redactAt < callAt, "redaction must happen before the provider call");
  assert.ok(src.includes("rawText: requestText"), "the provider must receive the scrubbed text");
});

check("the AI gateway reports what it removed and records the run", () => {
  const src = read("apps/web/src/lib/ai-task.ts");
  assert.ok(src.includes("pii: scrubbed.counts"), "the editor must be told what was removed");
  assert.ok(src.includes("recordAiTaskRun"), "every call must land in the ledger");
});

check("the AI task route records failures too", () => {
  const src = read("apps/web/src/app/api/ai/task/route.ts");
  assert.ok(src.includes("recordAiTaskRun"), "failures are calls too");
  assert.ok(src.includes("ok: false"), "a failed call must be recorded as failed");
});

check("anonymous comments run the display-name guard", () => {
  const src = read("apps/web/src/app/api/comments/route.ts");
  assert.ok(src.includes("assessDisplayName"), "the name field is a trust surface");
  const guardAt = src.indexOf("assessDisplayName(");
  const insertAt = src.indexOf("createComment(");
  assert.ok(guardAt !== -1 && insertAt !== -1 && guardAt < insertAt, "the guard must run before the insert");
});

check("deleting a post writes a ledger row with the actor", () => {
  const src = read("apps/web/src/app/api/posts/[id]/route.ts");
  assert.ok(src.includes("deletePost(id, {"), "the actor and reason must be passed to the delete");
  const db = read("packages/db/src/index.ts");
  assert.ok(db.includes("logDeletion({"), "deletePost must log the deletion");
});

check("retention purge snapshots rows before deleting them", () => {
  const src = read("packages/db/src/archive.ts");
  const snapshotAt = src.indexOf("SELECT * FROM posts WHERE id IN");
  const deleteAt = src.indexOf("DELETE FROM posts WHERE id IN");
  assert.ok(snapshotAt !== -1 && deleteAt !== -1 && snapshotAt < deleteAt, "a ledger cannot describe a deleted row");
  assert.ok(src.includes("logDeletion("), "purged posts must be logged");
});

check("AI provenance rides the same save as the text", () => {
  const src = read("apps/web/src/components/admin/PostEditor.tsx");
  assert.ok(src.includes("ai_assisted: aiAssisted !== null"), "provenance must be sent with the text");
  const route = read("apps/web/src/app/api/posts/[id]/route.ts");
  assert.ok(route.includes("body.ai_assisted"), "the route must accept provenance");
  const rows = read("packages/db/src/rows.ts");
  assert.ok(rows.includes("ai_prompt_version"), "the mapper must carry it to the UI");
});

check("the pause switch is admin-only and audited", () => {
  const src = read("apps/web/src/app/api/settings/route.ts");
  assert.ok(src.includes('requireApiRole("admin")'), "only an admin may stop collection");
  assert.ok(src.includes("collection_paused"), "the switch must be whitelisted");
  assert.ok(src.includes("সংগ্রহ বন্ধ"), "the audit summary must say what happened");
});

console.log(`\n${passed} safety-wiring checks passed.`);
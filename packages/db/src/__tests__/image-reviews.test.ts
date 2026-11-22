/**
 * Per-image approval records.
 *
 * "An operator reviewed the pictures before publishing" is only true if there is
 * a row per picture, so this file pins the four rules that make the record
 * trustworthy:
 *
 *   1. no row is `unreviewed`, and `unreviewed` is not an approval;
 *   2. the newest row for a path is the standing verdict, and history survives
 *      (a later approval supersedes a rejection by order, not by deletion);
 *   3. a rejection at the same instant beats an approval;
 *   4. a standing rejection blocks the publish of *that* path, and only that
 *      path — a picture on another post must not block this one.
 *
 * Run (from packages/db): npx tsx src/__tests__/image-reviews.test.ts
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { __useClientForTests, ensureImageReviewsTable } from "../client";
import {
  imagePublishConflict,
  listImageReviews,
  recordImageReview,
  standingVerdicts,
  type ImageReviewRow,
} from "../image-reviews";

let passed = 0;
async function check(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const client = createClient({ url: ":memory:" });
__useClientForTests(client);
await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY);
INSERT INTO posts (id) VALUES ('p1'), ('p2');
`);
await ensureImageReviewsTable(client);

await check(
  "no row means no verdict — an unreviewed image is not approved",
  async () => {
    assert.deepEqual(await listImageReviews("p1"), []);
    const conflicts = await imagePublishConflict("p1", ["media/a.png"]);
    assert.deepEqual(conflicts, []);
  },
);

await check(
  "a rejection is recorded with its reason and the actor",
  async () => {
    const row = await recordImageReview({
      postId: "p1",
      path: "media/a.png",
      verdict: "rejected",
      reason: "নকল/ওয়াটারমার্ক",
      reviewedBy: "editor@hoichoi.local",
    });
    assert.equal(row.verdict, "rejected");
    assert.equal(row.reason, "নকল/ওয়াটারমার্ক");
    assert.ok(row.reviewed_at);
  },
);

await check(
  "a standing rejection blocks the publish and names the picture",
  async () => {
    const conflicts = await imagePublishConflict("p1", ["media/a.png"]);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]?.path, "media/a.png");
    assert.equal(conflicts[0]?.reason, "নকল/ওয়াটারমার্ক");
    assert.equal(conflicts[0]?.reviewedBy, "editor@hoichoi.local");
  },
);

await check("it blocks only the picture that was rejected", async () => {
  const conflicts = await imagePublishConflict("p1", [
    "media/b.png",
    null,
    undefined,
  ]);
  assert.deepEqual(conflicts, []);
});

await check(
  "a later approval supersedes the rejection without deleting history",
  async () => {
    await recordImageReview({
      postId: "p1",
      path: "media/a.png",
      verdict: "approved",
      reviewedBy: "admin@hoichoi.local",
    });
    const rows = await listImageReviews("p1");
    assert.equal(rows.length, 2, "both decisions are kept");
    assert.equal(rows[0]?.verdict, "approved", "newest first");
    assert.deepEqual(await imagePublishConflict("p1", ["media/a.png"]), []);
  },
);

await check("at the same instant, a rejection beats an approval", () => {
  const at = "2026-05-01T10:00:00.000Z";
  const base = {
    post_id: "p1",
    reason: null,
    reviewed_by: "x",
    created_at: at,
  } as const;
  const rows: ImageReviewRow[] = [
    {
      ...base,
      id: "1",
      path: "media/c.png",
      verdict: "approved",
      reviewed_at: at,
    },
    {
      ...base,
      id: "2",
      path: "media/c.png",
      verdict: "rejected",
      reviewed_at: at,
    },
  ];
  const standing = standingVerdicts(rows);
  assert.equal(standing.get("media/c.png")?.verdict, "rejected");
});

await check("another post's rejection does not block this one", async () => {
  await recordImageReview({
    postId: "p2",
    path: "media/a.png",
    verdict: "rejected",
    reviewedBy: "editor@hoichoi.local",
  });
  assert.deepEqual(
    await imagePublishConflict("p1", ["media/a.png"]),
    [],
    "p1 approved it; p2 has its own record",
  );
  assert.equal((await imagePublishConflict("p2", ["media/a.png"])).length, 1);
});

await check("the review table is created idempotently", async () => {
  await ensureImageReviewsTable(client);
  const info = await client.execute("PRAGMA table_info(image_reviews)");
  assert.equal(
    info.rows.length,
    8,
    "id, post_id, path, verdict, reason, reviewed_by, reviewed_at, created_at",
  );
});

await check(
  "a decision survives a post whose row is gone (post_id nulled, not cascaded)",
  async () => {
    // The record is evidence about a picture; it outlives the post row by design
    // for NULL-post reviews, which are the ones used by the media console.
    const row = await recordImageReview({
      postId: null,
      path: "media/standalone.png",
      verdict: "rejected",
      reviewedBy: "editor@hoichoi.local",
    });
    assert.equal(row.post_id, null);
    const info = await client.execute(
      "SELECT count(*) AS n FROM image_reviews WHERE post_id IS NULL",
    );
    assert.equal(Number((info.rows[0] as unknown as { n: number }).n), 1);
  },
);

await check(
  "two decisions in one millisecond still have an order",
  async () => {
    // The wall clock has millisecond resolution and CI ran both inserts inside
    // one tick, which made "a later approval supersedes" a coin flip. The record
    // clock may not go backwards, so the second decision is always newer.
    const first = await recordImageReview({
      postId: "p2",
      path: "media/rapid.png",
      verdict: "rejected",
      reason: "মান খারাপ",
      reviewedBy: "editor@hoichoi.local",
    });
    const second = await recordImageReview({
      postId: "p2",
      path: "media/rapid.png",
      verdict: "approved",
      reviewedBy: "editor@hoichoi.local",
    });
    assert.notEqual(first.reviewed_at, second.reviewed_at, "the stamps differ");
    assert.ok(
      Date.parse(second.reviewed_at) > Date.parse(first.reviewed_at),
      second.reviewed_at + " is after " + first.reviewed_at,
    );
    assert.deepEqual(
      await imagePublishConflict("p2", ["media/rapid.png"]),
      [],
      "and the approval is what stands",
    );
  },
);

console.log(`\nimage reviews: ${passed} checks passed`);

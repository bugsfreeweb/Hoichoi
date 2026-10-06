import assert from "node:assert/strict";

/**
 * Regression test for IMG-1 image dedup matching a post against itself.
 *
 * The pipeline writes a post's own perceptual hash onto its own `raw_posts`
 * row (STEP 4) before dedup runs (STEP 6), and `findImageDuplicates` compared
 * against every row carrying a hash. Hamming distance to itself is 0, so every
 * post was reported as an `img-1` duplicate of itself and dropped. Runs looked
 * healthy — no errors, media mirrored — while reporting `rewritten: 0,
 * published: 0` with six of eight posts blocked.
 *
 * This drives the real `findImageDuplicates` against a throwaway SQLite file so
 * the exclusion is pinned to the shipped code, not a copy of it.
 */
process.env.TURSO_DATABASE_URL = "file:./.tmp-dedup-self-match-test.db";

const { getClient } = await import("@hoichoi/db");
const { findImageDuplicates } = await import("../dedup");

const HASH_A = "3088802002808800ffffffffffffffff";
const HASH_B = "1111111111111111ffffffffffffffff";
const NEAR_A = "3088802002808801ffffffffffffffff"; // 1 bit from HASH_A

const client = getClient() as {
  execute: (q: { sql: string; args?: unknown[] } | string) => Promise<{ rows: Record<string, unknown>[] }>;
};

await client.execute("DROP TABLE IF EXISTS raw_posts");
await client.execute("DROP TABLE IF EXISTS posts");
await client.execute(
  "CREATE TABLE raw_posts (id TEXT PRIMARY KEY, phash TEXT, scraped_at TEXT)",
);
await client.execute("CREATE TABLE posts (id TEXT PRIMARY KEY, raw_post_id TEXT)");

async function seed(id: string, phash: string): Promise<void> {
  await client.execute({
    sql: "INSERT INTO raw_posts (id, phash, scraped_at) VALUES (?, ?, ?)",
    args: [id, phash, new Date().toISOString()],
  });
}

const checks: Array<{ label: string; run: () => Promise<void> }> = [
  {
    label: "a post does not dedup against its own raw row",
    run: async () => {
      await client.execute("DELETE FROM raw_posts");
      await seed("raw-self", HASH_A);
      const dup = await findImageDuplicates(HASH_A, "raw-self");
      assert.equal(dup, null, "the post's own hash must not count as a duplicate");
    },
  },
  {
    label: "an identical image on a different post is still a duplicate",
    run: async () => {
      await client.execute("DELETE FROM raw_posts");
      await seed("raw-other", HASH_A);
      await seed("raw-self", HASH_A);
      const dup = await findImageDuplicates(HASH_A, "raw-self");
      assert.ok(dup, "a re-used image must still be caught");
      assert.equal(dup.rawId, "raw-other");
      assert.equal(dup.dist, 0);
    },
  },
  {
    label: "a near-identical image within the threshold is caught",
    run: async () => {
      await client.execute("DELETE FROM raw_posts");
      await seed("raw-other", HASH_A);
      await seed("raw-self", NEAR_A);
      const dup = await findImageDuplicates(NEAR_A, "raw-self");
      assert.ok(dup, "a 1-bit difference is still a near-duplicate");
      assert.equal(dup.rawId, "raw-other");
      assert.equal(dup.dist, 1);
    },
  },
  {
    label: "a genuinely different image is not a duplicate",
    run: async () => {
      await client.execute("DELETE FROM raw_posts");
      await seed("raw-other", HASH_A);
      await seed("raw-self", HASH_B);
      const dup = await findImageDuplicates(HASH_B, "raw-self");
      assert.equal(dup, null);
    },
  },
  {
    label: "no hash means no candidate",
    run: async () => {
      await client.execute("DELETE FROM raw_posts");
      await seed("raw-other", HASH_A);
      const dup = await findImageDuplicates(null, "raw-self");
      assert.equal(dup, null);
    },
  },
];

let failed = 0;
for (const c of checks) {
  try {
    await c.run();
    console.log(`  ok  ${c.label}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${c.label}\n       ${(e as Error).message}`);
  }
}

await client.execute("DELETE FROM raw_posts");
await client.execute("DELETE FROM posts");

console.log(`dedup-self-match: ${checks.length - failed}/${checks.length} passed`);
if (failed > 0) process.exit(1);
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
const { findImageDuplicates, checkDedup } = await import("../dedup");

const HASH_A = "3088802002808800ffffffffffffffff";
const HASH_B = "1111111111111111ffffffffffffffff";

/** Flip specific bits of a 64-bit hash so distances are exact, not guessed. */
function flipBits(hash: string, bits: number[]): string {
  let v = BigInt(`0x${hash}`);
  for (const bit of bits) v ^= 1n << BigInt(bit);
  return v.toString(16).padStart(hash.length, "0");
}

const NEAR_A = flipBits(HASH_A, [3]); // 1 bit away - the same picture
const LOOSE_A = flipBits(HASH_A, [0, 1, 4, 7, 9, 12, 13, 14]); // 8 bits away - a different one

const client = getClient() as {
  execute: (q: { sql: string; args?: unknown[] } | string) => Promise<{
    rows: Record<string, unknown>[];
    rowsAffected: number;
  }>;
};

await client.execute("DROP TABLE IF EXISTS raw_posts");
await client.execute("DROP TABLE IF EXISTS posts");
await client.execute(
  "CREATE TABLE raw_posts (id TEXT PRIMARY KEY, source_id TEXT, fb_post_id TEXT, fb_post_url TEXT, phash TEXT, raw_text TEXT, scraped_at TEXT)",
);
await client.execute("CREATE TABLE posts (id TEXT PRIMARY KEY, raw_post_id TEXT)");

async function seed(id: string, phash: string, url = `https://facebook.com/page/posts/${id}`): Promise<void> {
  await client.execute({
    sql: "INSERT INTO raw_posts (id, source_id, fb_post_id, fb_post_url, phash, raw_text, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, "src", `fb-${id}`, url, phash, "seed", new Date().toISOString()],
  });
}

async function reset(): Promise<void> {
  await client.execute("DELETE FROM raw_posts");
  await client.execute("DELETE FROM posts");
}

const LONG_CAPTION =
  "যুক্তরাজ্যের গাড়ি শিল্প বর্তমানে চীন ও ইউরোপীয় বাজারে এক শতাংশেরও কম জায়গা দখল করেছে বলে জানা যাচ্ছে।";

const checks: Array<{ label: string; run: () => Promise<void> }> = [
  {
    label: "a post does not dedup against its own raw row",
    run: async () => {
      await reset();
      await seed("raw-self", HASH_A);
      assert.equal(await findImageDuplicates(HASH_A, "raw-self"), null);
    },
  },
  {
    label: "an identical image on a different post is still a duplicate",
    run: async () => {
      await reset();
      await seed("raw-other", HASH_A);
      await seed("raw-self", HASH_A);
      const dup = await findImageDuplicates(HASH_A, "raw-self");
      assert.ok(dup);
      assert.equal(dup.rawId, "raw-other");
      assert.equal(dup.dist, 0);
    },
  },
  {
    label: "a near-identical image within the threshold is caught",
    run: async () => {
      await reset();
      await seed("raw-other", HASH_A);
      await seed("raw-self", NEAR_A);
      const dup = await findImageDuplicates(NEAR_A, "raw-self");
      assert.ok(dup);
      assert.equal(dup.dist, 1);
    },
  },
  {
    label: "unrelated news images that merely look alike are not duplicates",
    run: async () => {
      // Eight differing bits was reported as a duplicate and silently dropped
      // six of eight real posts per run.
      await reset();
      await seed("raw-other", HASH_A);
      await seed("raw-self", LOOSE_A);
      assert.equal(await findImageDuplicates(LOOSE_A, "raw-self"), null);
    },
  },
  {
    label: "a genuinely different image is not a duplicate",
    run: async () => {
      await reset();
      await seed("raw-other", HASH_A);
      await seed("raw-self", HASH_B);
      assert.equal(await findImageDuplicates(HASH_B, "raw-self"), null);
    },
  },
  {
    label: "no hash means no candidate",
    run: async () => {
      await reset();
      await seed("raw-other", HASH_A);
      assert.equal(await findImageDuplicates(null, "raw-self"), null);
    },
  },
  {
    label: "a captioned post is not suppressed just for reusing a photo",
    run: async () => {
      await reset();
      await seed("raw-self", HASH_A);
      await seed("raw-other", HASH_A);
      const res = await checkDedup({
        fbPostUrl: "https://facebook.com/page/posts/fresh",
        rawText: LONG_CAPTION,
        phash: HASH_A,
        vector: null,
        skipExact: true,
        excludeRawId: "raw-self",
      });
      assert.equal(res.duplicate, false, "SEM-1, not IMG-1, judges a captioned post");
    },
  },
  {
    label: "a caption-less image post is still blocked as a repeated picture",
    run: async () => {
      await reset();
      await seed("raw-self", HASH_A);
      await seed("raw-other", HASH_A);
      const res = await checkDedup({
        fbPostUrl: "https://facebook.com/page/posts/fresh",
        rawText: "",
        phash: HASH_A,
        vector: null,
        skipExact: true,
        excludeRawId: "raw-self",
      });
      assert.equal(res.duplicate, true);
      assert.equal(res.reason, "img-1");
      assert.equal(res.matchedRawId, "raw-other");
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
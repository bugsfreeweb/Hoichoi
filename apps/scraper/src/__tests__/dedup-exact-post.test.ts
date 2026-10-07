import assert from "node:assert/strict";

/**
 * Regression test for `isExactDuplicate` letting a post through on every run.
 *
 * Facebook serves the same permalink with a fresh `?__cft__[0]=...` tracking
 * token each crawl, and `isExactDuplicate` compared that URL against
 * `canonicalPostUrl()` - which strips `www.` and the query. The two sides were
 * never equal, so the guard never returned true. Combined with a caption long
 * enough to skip the image check and no stored embedding, the same post was
 * rewritten and published again on every run: one story reached the live site
 * five times under five different titles.
 *
 * The guard must also stay narrow enough to allow a retry of a post that was
 * scraped while empty and produced no post row - otherwise a transient
 * extraction failure would retire the story forever.
 */
process.env.TURSO_DATABASE_URL = "file:./.tmp-dedup-exact-post-test.db";

const { getClient } = await import("@hoichoi/db");
const { isExactDuplicate } = await import("../dedup");
const { fbPostKey } = await import("../facebook");

const client = getClient() as {
  execute: (q: { sql: string; args?: unknown[] } | string) => Promise<{
    rows: Record<string, unknown>[];
    rowsAffected: number;
  }>;
};

await client.execute("DROP TABLE IF EXISTS raw_posts");
await client.execute("DROP TABLE IF EXISTS posts");
await client.execute(
  "CREATE TABLE raw_posts (id TEXT PRIMARY KEY, source_id TEXT, fb_post_id TEXT, fb_post_url TEXT)",
);
await client.execute(
  "CREATE TABLE posts (id TEXT PRIMARY KEY, raw_post_id TEXT, source_url TEXT, status TEXT)",
);

const PERMALINK = "https://www.facebook.com/dailymohajug/posts/pfbid036As4JChjenNNVTZ7otofTSFLCTPA3gZNuRuQAz515xFMhyESbSTcHwHmzZS4imYAl";

async function reset(): Promise<void> {
  await client.execute("DELETE FROM raw_posts");
  await client.execute("DELETE FROM posts");
}

const checks: Array<{ label: string; run: () => Promise<void> }> = [
  {
    label: "a re-scrape gets a fresh tracking token and is still the same post",
    run: async () => {
      await reset();
      const key = fbPostKey(PERMALINK);
      await client.execute({
        sql: "INSERT INTO raw_posts (id, source_id, fb_post_id, fb_post_url) VALUES (?, ?, ?, ?)",
        args: ["raw-1", "src", key, `${PERMALINK}?__cft__[0]=FIRST&__tn__=%2CO%2CP-R`],
      });
      await client.execute({
        sql: "INSERT INTO posts (id, raw_post_id, source_url, status) VALUES (?, ?, ?, ?)",
        args: ["post-1", "raw-1", `${PERMALINK}?__cft__[0]=FIRST`, "published"],
      });
      const again = `${PERMALINK}?__cft__[0]=SECOND&__tn__=%2CO%2CP-R`;
      assert.equal(await isExactDuplicate(again, key), true);
    },
  },
  {
    label: "a post scraped empty can be scraped again",
    run: async () => {
      await reset();
      const key = fbPostKey(PERMALINK);
      await client.execute({
        sql: "INSERT INTO raw_posts (id, source_id, fb_post_id, fb_post_url) VALUES (?, ?, ?, ?)",
        args: ["raw-1", "src", key, PERMALINK],
      });
      // Seen, but never turned into a post - the empty-body case that must not
      // be treated as "already handled" or the story is lost for good.
      assert.equal(await isExactDuplicate(PERMALINK, key), false);
    },
  },
  {
    label: "a published post is still recognised after its raw row is deleted",
    run: async () => {
      await reset();
      // No raw_posts row at all: the source was removed and cascaded away.
      await client.execute({
        sql: "INSERT INTO posts (id, raw_post_id, source_url, status) VALUES (?, ?, ?, ?)",
        args: ["post-1", null, `${PERMALINK}?__cft__[0]=ANY`, "published"],
      });
      assert.equal(await isExactDuplicate(PERMALINK, null), true);
    },
  },
  {
    label: "host and path case differences do not hide a published post",
    run: async () => {
      await reset();
      await client.execute({
        sql: "INSERT INTO posts (id, raw_post_id, source_url, status) VALUES (?, ?, ?, ?)",
        args: [
          "post-1",
          null,
          "https://m.facebook.com/DailyMohajug/Posts/PFBID036As4JChjenNNVTZ7otofTSFLCTPA3gZNuRuQAz515xFMhyESbSTcHwHmzZS4imYAl",
          "published",
        ],
      });
      assert.equal(await isExactDuplicate(PERMALINK, null), true);
    },
  },
  {
    label: "an unseen post is not a duplicate",
    run: async () => {
      await reset();
      assert.equal(
        await isExactDuplicate("https://www.facebook.com/hoichoi/posts/pfbid0DIFFERENTpost12345", null),
        false,
      );
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

console.log(`dedup-exact-post: ${checks.length - failed}/${checks.length} passed`);
if (failed > 0) process.exit(1);
import assert from "node:assert/strict";
import { createClient, type Client, type InValue, type Row } from "@libsql/client";
import { ensureUniqueSourceUrls } from "../client";

/**
 * Regression test for the duplicate-source bug.
 *
 * `sources.page_url` used to be UNIQUE, but the legacy-schema rebuild derives
 * CREATE TABLE from `PRAGMA table_info` (which cannot express UNIQUE) and the
 * insert path had no existence check either, so the same Facebook page was
 * stored 2-3 times under different ids. Users saw duplicate cards in
 * Settings > Source and duplicate rows in the Watchlist.
 */
const DB = "file:./.tmp-source-merge-test.db";

const openClients: Client[] = [];

const rows = async (client: Client, sql: string, args: InValue[] = []): Promise<Row[]> =>
  (await client.execute({ sql, args })).rows;

/** First row, asserted to exist — keeps assertions free of `!` noise. */
async function one(client: Client, sql: string, args: InValue[] = []): Promise<Row> {
  const r = await rows(client, sql, args);
  assert.ok(r.length > 0, `expected at least one row for: ${sql.slice(0, 60)}`);
  return r[0]!;
}

const count = async (client: Client, sql: string, args: InValue[] = []): Promise<number> =>
  Number((await one(client, sql, args)).c);

async function freshClient(): Promise<Client> {
  const client = createClient({ url: DB, authToken: "local" });
  openClients.push(client);
  for (const t of ["source_categories", "source_errors", "raw_posts", "posts", "sources", "category_configs"]) {
    await client.execute(`DROP TABLE IF EXISTS ${t}`);
  }
  await client.batch(
    [
      `CREATE TABLE sources (
         id TEXT PRIMARY KEY, page_url TEXT NOT NULL, page_name TEXT, category TEXT,
         is_verified INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
         kind TEXT, fb_id TEXT, topics TEXT, created_at TEXT, health INTEGER DEFAULT 100,
         last_scraped_at TEXT
       )`,
      `CREATE TABLE category_configs (slug TEXT PRIMARY KEY)`,
      `INSERT INTO category_configs (slug) VALUES
         ('missing-children'), ('child-sexual-abuse'), ('cyber-bullying')`,
      `CREATE TABLE source_categories (
         source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
         category_slug TEXT NOT NULL REFERENCES category_configs(slug) ON DELETE CASCADE,
         PRIMARY KEY (source_id, category_slug)
       )`,
      `CREATE TABLE posts (id TEXT PRIMARY KEY, source_id TEXT REFERENCES sources(id) ON DELETE SET NULL, source_url TEXT, title_bn TEXT)`,
      `CREATE TABLE raw_posts (id TEXT PRIMARY KEY, source_id TEXT REFERENCES sources(id) ON DELETE CASCADE, fb_post_id TEXT, fb_post_url TEXT)`,
      `CREATE TABLE source_errors (id TEXT PRIMARY KEY, source_id TEXT REFERENCES sources(id) ON DELETE CASCADE)`,
    ],
    "write",
  );
  return client;
}

/** 5 pages stored 3x each = 15 rows, matching the live production shape. */
async function seedTriplicates(client: Client): Promise<void> {
  const pages = ["hoichoi", "dhwaminfo", "protectchildren", "bangladeshtimes", "thedaily"];
  const src: string[] = [];
  const cat: string[] = [];
  for (const [p, page] of pages.entries()) {
    for (let k = 0; k < 3; k++) {
      const id = `s${p}_${k}`;
      src.push(
        `('${id}','https://www.facebook.com/${page}','Page ${page}','missing-children',1,1,'page',NULL,'[]','2026-09-0${k + 1}T00:00:00Z',100,NULL)`,
      );
      cat.push(`('${id}','missing-children')`);
      // Spread extra categories across the duplicates so the merge must union.
      if (k === 1) cat.push(`('${id}','child-sexual-abuse')`);
      if (k === 2) cat.push(`('${id}','cyber-bullying')`);
    }
  }
  await client.execute({
    sql: `INSERT INTO sources (id,page_url,page_name,category,is_verified,is_active,kind,fb_id,topics,created_at,health,last_scraped_at) VALUES ${src.join(",")}`,
    args: [],
  });
  await client.execute({ sql: `INSERT INTO source_categories (source_id,category_slug) VALUES ${cat.join(",")}`, args: [] });
  await client.execute({ sql: `INSERT INTO posts VALUES ('p1','s0_0','u1','t1'),('p2','s0_1','u2','t2'),('p3','s0_2','u3','t3')`, args: [] });
  await client.execute({ sql: `INSERT INTO raw_posts VALUES ('r1','s0_0','f1','u1'),('r2','s0_2','f2','u2')`, args: [] });
  await client.execute({ sql: `INSERT INTO source_errors VALUES ('e1','s0_1')`, args: [] });
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

await check("merges triplicate sources into one row per page and unions categories", async () => {
  const client = await freshClient();
  await seedTriplicates(client);
  const { merged } = await ensureUniqueSourceUrls(client);
  assert.equal(merged, 10, "expected 15 rows -> 5, so 10 merges");
  assert.equal(await count(client, "SELECT count(*) c FROM sources"), 5);
  assert.equal(
    await count(client, "SELECT count(*) c FROM (SELECT page_url FROM sources GROUP BY page_url HAVING count(*)>1)"),
    0,
    "no page_url may repeat",
  );
  const cats = await one(
    client,
    `SELECT group_concat(category_slug) c FROM source_categories
      WHERE source_id = (SELECT id FROM sources WHERE page_url = 'https://www.facebook.com/hoichoi')`,
  );
  assert.equal(
    String(cats.c).split(",").sort().join(","),
    "child-sexual-abuse,cyber-bullying,missing-children",
    "categories of the three duplicates must be unioned, not dropped",
  );
});

await check("repoints child rows so posts/raw_posts/source_errors survive", async () => {
  const client = await freshClient();
  await seedTriplicates(client);
  await ensureUniqueSourceUrls(client);
  const posts = await rows(client, "SELECT source_id FROM posts ORDER BY id");
  assert.equal(new Set(posts.map((r) => String(r.source_id))).size, 1, "all 3 posts share the survivor");
  assert.equal(await count(client, "SELECT count(*) c FROM raw_posts"), 2, "raw_posts must not be cascade-deleted");
  assert.equal(await count(client, "SELECT count(*) c FROM source_errors"), 1);
  assert.equal(
    await count(client, "SELECT count(*) c FROM source_categories sc WHERE NOT EXISTS (SELECT 1 FROM sources s WHERE s.id=sc.source_id)"),
    0,
    "no orphan category rows",
  );
});

await check("installs the unique index and is idempotent", async () => {
  const client = await freshClient();
  await seedTriplicates(client);
  await ensureUniqueSourceUrls(client);
  assert.equal(
    await count(
      client,
      "SELECT count(*) c FROM sqlite_master WHERE type='index' AND tbl_name='sources' AND name='idx_sources_page_url'",
    ),
    1,
    "unique index on page_url must exist",
  );
  const again = await ensureUniqueSourceUrls(client);
  assert.equal(again.merged, 0, "second run is a no-op");
  assert.equal(await count(client, "SELECT count(*) c FROM sources"), 5);
  // With the index in place a direct duplicate insert is now rejected.
  await assert.rejects(() =>
    client.execute({
      sql: "INSERT INTO sources (id,page_url) VALUES ('dup','https://www.facebook.com/hoichoi')",
      args: [],
    }),
  );
});

console.log(`\n[db] ${passed} checks passed`);

// The native libsql handle can fault during V8 teardown on Windows, which would
// report a crash even when every assertion passed. Close explicitly and exit
// with the status the checks decided.
for (const c of openClients) {
  try {
    c.close();
  } catch {
    /* ignore */
  }
}
process.exit(process.exitCode ?? 0);

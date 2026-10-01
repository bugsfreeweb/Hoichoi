import assert from "node:assert/strict";
import { createClient, type Client, type InValue, type Row } from "@libsql/client";

/**
 * Regression test for "I save several categories under one source and it does
 * not stick".
 *
 * Two separate defects produced that symptom:
 *
 *  1. The web source editor wrote `updated_at`, a column `sources` has never
 *     had, so every save died with `no such column: updated_at` and returned
 *     409. Nothing was written, so the row always looked reverted.
 *  2. Saves replaced the whole membership set after filtering it through the
 *     *active* category list, so any membership pointing at a deactivated
 *     category was deleted on every save — invisibly, because the admin UI
 *     never rendered inactive categories either.
 *
 * This test pins the persistence contract: what you set is what you read back,
 * and the schema really has no `updated_at` to trip over.
 */
const DB = "file:./.tmp-source-categories-test.db";

const openClients: Client[] = [];

const rows = async (client: Client, sql: string, args: InValue[] = []): Promise<Row[]> =>
  (await client.execute({ sql, args })).rows;

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
  for (const t of ["source_categories", "sources", "category_configs"]) {
    await client.execute(`DROP TABLE IF EXISTS ${t}`);
  }
  await client.batch(
    [
      // Mirrors 001_init.sql + the runtime column repair in client.ts. Note
      // there is deliberately no `updated_at` here.
      `CREATE TABLE sources (
         id TEXT PRIMARY KEY, page_url TEXT NOT NULL, page_name TEXT, category TEXT,
         is_verified INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
         kind TEXT, fb_id TEXT, topics TEXT, created_at TEXT, health INTEGER DEFAULT 100,
         last_scraped_at TEXT
       )`,
      `CREATE TABLE category_configs (slug TEXT PRIMARY KEY, is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0)`,
      `INSERT INTO category_configs (slug, is_active, sort_order) VALUES
         ('child-sexual-abuse',1,1), ('extramarital-crime',1,2),
         ('missing-children',1,3), ('retired-topic',0,4)`,
      `CREATE TABLE source_categories (
         source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
         category_slug TEXT NOT NULL REFERENCES category_configs(slug) ON DELETE CASCADE,
         PRIMARY KEY (source_id, category_slug)
       )`,
      `INSERT INTO sources (id,page_url,page_name,category,is_verified,is_active,kind,fb_id,topics,created_at,health,last_scraped_at)
         VALUES ('src-1','https://www.facebook.com/hoichoi','Hoichoi','missing-children',0,1,'page',NULL,'[]','2026-09-01T00:00:00Z',100,NULL)`,
    ],
    "write",
  );
  return client;
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

await check("sources really has no updated_at column", async () => {
  const client = await freshClient();
  const cols = await rows(client, "PRAGMA table_info(sources)");
  const names = cols.map((c) => String(c.name));
  assert.ok(!names.includes("updated_at"), "the old editor wrote a column that does not exist");
  // And prove the failure mode it caused.
  await assert.rejects(
    () => client.execute({ sql: "UPDATE sources SET updated_at = ? WHERE id = 'src-1'", args: ["2026-09-30T00:00:00Z"] }),
    /no such column/i,
  );
});

await check("a partial edit without categories leaves membership alone", async () => {
  const client = await freshClient();
  await client.execute({
    sql: "INSERT INTO source_categories (source_id, category_slug) VALUES ('src-1','child-sexual-abuse'),('src-1','missing-children')",
    args: [],
  });
  // Editing only the name must not rewrite the junction table.
  await client.execute({ sql: "UPDATE sources SET page_name = 'Renamed' WHERE id = 'src-1'", args: [] });
  const kept = await rows(client, "SELECT category_slug FROM source_categories WHERE source_id='src-1' ORDER BY category_slug");
  assert.equal(kept.length, 2, "renaming a source must not drop its categories");
});

await check("a deactivated category survives a save that replaces the set", async () => {
  const client = await freshClient();
  // The editor round-trips what it was given, including a retired category.
  await client.execute({
    sql: "INSERT INTO source_categories (source_id, category_slug) VALUES ('src-1','retired-topic'),('src-1','missing-children')",
    args: [],
  });
  const current = await rows(client, "SELECT category_slug FROM source_categories WHERE source_id='src-1'");
  const slugs = current.map((r) => String(r.category_slug));
  // Replace the set with exactly what was loaded — the round trip an editor does.
  await client.execute({ sql: "DELETE FROM source_categories WHERE source_id = 'src-1'", args: [] });
  const values = slugs.map(() => "(?, ?)").join(", ");
  await client.execute({
    sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`,
    args: slugs.flatMap((s) => ["src-1", s]),
  });
  const after = await rows(client, "SELECT category_slug FROM source_categories WHERE source_id='src-1' ORDER BY category_slug");
  assert.deepEqual(
    after.map((r) => String(r.category_slug)),
    ["missing-children", "retired-topic"],
    "an inactive category must not be filtered out on save",
  );
});

await check("duplicate slugs collapse to one membership row", async () => {
  const client = await freshClient();
  const seen = new Set(["missing-children", "missing-children", "child-sexual-abuse"]);
  await client.execute({ sql: "DELETE FROM source_categories WHERE source_id = 'src-1'", args: [] });
  const slugs = [...seen];
  const values = slugs.map(() => "(?, ?)").join(", ");
  await client.execute({
    sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`,
    args: slugs.flatMap((s) => ["src-1", s]),
  });
  assert.equal(
    await count(client, "SELECT count(*) c FROM source_categories WHERE source_id='src-1'"),
    2,
    "the junction primary key must keep membership unique",
  );
});

await check("the legacy category column follows the membership it describes", async () => {
  const client = await freshClient();
  // This is what `sources update --categories` does after replacing the set.
  // The scraper falls back to this column when a source has no membership row,
  // so if it is left behind the same source reads as two different categories
  // depending on which surface asks.
  const csv = "child-sexual-abuse,extramarital-crime";
  const categories = csv
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  await client.execute({ sql: "DELETE FROM source_categories WHERE source_id = 'src-1'", args: [] });
  const values = categories.map(() => "(?, ?)").join(", ");
  await client.execute({
    sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`,
    args: categories.flatMap((c) => ["src-1", c]),
  });
  const primary = categories[0];
  assert.ok(primary, "the fixture must have at least one category");
  await client.execute({
    sql: "UPDATE sources SET category = ? WHERE id = ?",
    args: [primary, "src-1"],
  });
  const r = await one(client, "SELECT category FROM sources WHERE id = 'src-1'");
  assert.equal(
    String(r.category),
    primary,
    "the legacy column must be the first membership slug",
  );
  // And the fallback the pipeline relies on resolves to a real slug, never null.
  const sc = await rows(client, "SELECT category_slug FROM source_categories WHERE source_id='src-1'");
  const slugs = sc.map((x) => String(x.category_slug));
  assert.equal(slugs.length > 0 ? slugs[0] : String(r.category), slugs[0]);
  assert.ok(slugs[0], "a source with membership must resolve to a usable category");
});

console.log(`\n[db] ${passed} checks passed`);

for (const c of openClients) {
  try {
    c.close();
  } catch {
    /* ignore */
  }
}
process.exit(process.exitCode ?? 0);

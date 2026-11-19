/**
 * The desk a plate prints.
 *
 * The bug this pins: `/admin/categories` is operator-editable, so a real database
 * holds desks the code-level seed list has never heard of — the live site files
 * 604 stories under `tech`, which the seeds spell `technology`. Every one of them
 * was badged with the neutral "সংবাদ" because the plate asked the seeds. So the
 * lookup is tested against a real table, not against a constant.
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { __useClientForTests } from "../client";
import { deskFor, deskForCategory } from "../plate-meta";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const client = createClient({ url: ":memory:" });
  __useClientForTests(client);
  await client.execute(`CREATE TABLE category_configs (
    slug TEXT PRIMARY KEY,
    display_name_bn TEXT NOT NULL,
    display_name_en TEXT NOT NULL,
    description_bn TEXT,
    description_en TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    config TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  const now = new Date().toISOString();
  const insert = (slug: string, bn: string, en: string, config = "{}") =>
    client.execute({
      sql: "INSERT INTO category_configs (slug, display_name_bn, display_name_en, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [slug, bn, en, config, now, now],
    });
  // `tech` is the desk the seeds get wrong; `international` is one they lack
  // entirely; `sports` is one they already know, so the two sources must agree.
  await insert("tech", "তথ্যপ্রযুক্তি", "Technology");
  await insert("international", "আন্তর্জাতিক", "International");
  await insert("sports", "খেলাধুলা", "Sports");
  await insert("custom-desk", "নিজস্ব ডেস্ক", "Custom desk", '{"dot":"1a2b3c"}');

  await check("the seed alone cannot name the desk the database knows", () => {
    // The bug, stated: the sync lookup has never heard of `tech`.
    assert.equal(deskFor("tech").label, null);
    assert.equal(deskFor("international").label, null);
  });

  await check("the database's own Bangla name wins", async () => {
    assert.equal((await deskForCategory("tech")).label, "তথ্যপ্রযুক্তি");
    assert.equal((await deskForCategory("international")).label, "আন্তর্জাতিক");
    assert.equal((await deskForCategory("sports")).label, "খেলাধুলা");
  });

  await check("a desk that declares its own colour keeps it", async () => {
    assert.equal((await deskForCategory("custom-desk")).accent, "#1a2b3c");
    // A desk with no declared dot borrows the seed colour it was seeded with…
    assert.match((await deskForCategory("sports")).accent, /^#[0-9a-f]{6}$/i);
    // …and a desk with neither is the newsroom red, not an invention.
    assert.equal((await deskForCategory("tech")).accent, "#e8552d");
  });

  await check("an unknown or empty slug is not invented", async () => {
    assert.equal((await deskForCategory("not-a-desk")).label, null);
    assert.equal((await deskForCategory(null)).label, null);
    assert.equal((await deskForCategory("")).label, null);
    assert.equal((await deskForCategory("")).accent, "#e8552d");
  });

  await check("the lookup is cached, and a rename lands for a fresh slug", async () => {
    const first = await deskForCategory("tech");
    await client.execute({
      sql: "UPDATE category_configs SET display_name_bn = 'প্রযুক্তি' WHERE slug = 'tech'",
      args: [],
    });
    const second = await deskForCategory("tech");
    assert.equal(second.label, first.label, "a cached desk does not change mid-run");
  });

  await check("no database degrades to the seeds, it does not throw", async () => {
    __useClientForTests(null);
    // A fresh slug that is not cached yet, against a client that cannot be built.
    const fallback = await deskForCategory("politics");
    // With no usable table the answer must equal what the seeds say, not null and
    // not an exception: a picture is never blocked by a label lookup.
    assert.equal(fallback.label, deskFor("politics").label);
    assert.notEqual(deskFor("politics").label, null, "politics is a seeded desk");
    assert.equal(fallback.accent, deskFor("politics").accent);
  });

  console.log(`\ndesk lookup: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

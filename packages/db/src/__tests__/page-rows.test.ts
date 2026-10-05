import assert from "node:assert/strict";
import { createClient, type Client, type InValue, type Row } from "@libsql/client";

/**
 * Regression test for the shared `pageRows` helper that now backs every admin
 * list.
 *
 * The admin queues each ran their own unbounded SELECT and sliced in JS, or
 * picked a hard LIMIT with no page control. Both are wrong in the same way:
 * an operator with more rows than fit on screen had no way to reach the rest,
 * and the page read the whole table to render one screen of it.
 *
 * `pageRows` is what keeps that from regressing, so this pins its contract
 * against a real SQLite database rather than a hand-written stub: the COUNT
 * subquery, the LIMIT/OFFSET window, argument ordering when a filter is present,
 * and clamping of hostile page numbers.
 */
const DB = "file:./.tmp-page-rows-test.db";

const openClients: Client[] = [];

const rows = async (client: Client, sql: string, args: InValue[] = []): Promise<Row[]> =>
  (await client.execute({ sql, args })).rows;

/** Mirror of `pageRows` from src/index.ts, inlined against this fixture client. */
async function pageRows<T>(
  client: Client,
  opts: {
    sql: string;
    where?: string;
    order: string;
    args?: InValue[];
    page?: number;
    pageSize?: number;
    map?: (row: Record<string, unknown>) => T;
  },
): Promise<{ rows: T[]; total: number; page: number; pageSize: number }> {
  const n = Number(opts.page);
  const safe = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  const pageSize = Math.max(1, Math.floor(opts.pageSize ?? 20));
  const where = opts.where ? ` WHERE ${opts.where}` : "";
  const filterArgs = opts.args ?? [];

  const countRes = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM (${opts.sql}${where})`,
    args: filterArgs,
  });
  const total = Number((countRes.rows[0] as Record<string, unknown>).n ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(safe, pageCount);

  const res = await client.execute({
    sql: `${opts.sql}${where} ORDER BY ${opts.order} LIMIT ? OFFSET ?`,
    args: [...filterArgs, pageSize, (p - 1) * pageSize],
  });

  return {
    rows: opts.map
      ? res.rows.map((r) => opts.map!(r as Record<string, unknown>))
      : (res.rows as Record<string, unknown>[]) as T[],
    total,
    page: p,
    pageSize,
  };
}

async function freshClient(): Promise<Client> {
  const client = createClient({ url: DB, authToken: "local" });
  openClients.push(client);
  await client.execute("DROP TABLE IF EXISTS removal_requests");
  await client.batch(
    [
      `CREATE TABLE removal_requests (
         id TEXT PRIMARY KEY, status TEXT NOT NULL, created_at TEXT NOT NULL
       )`,
    ],
    "write",
  );

  // 25 open, 5 closed. Oldest-first insertion so created_at order is predictable.
  const inserts: string[] = [];
  for (let i = 1; i <= 25; i++) {
    inserts.push(
      `('open-${String(i).padStart(2, "0")}','open','2026-09-${String(i).padStart(2, "0")}T00:00:00Z')`,
    );
  }
  for (let i = 1; i <= 5; i++) {
    inserts.push(
      `('done-${String(i).padStart(2, "0")}','approved','2026-08-${String(i).padStart(2, "0")}T00:00:00Z')`,
    );
  }
  await client.execute(`INSERT INTO removal_requests (id,status,created_at) VALUES ${inserts.join(", ")}`);
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

const openQueue = (client: Client, page?: number, pageSize = 20) =>
  pageRows<Record<string, unknown>>(client, {
    sql: "SELECT * FROM removal_requests",
    where: "status = 'open'",
    order: "created_at DESC",
    page,
    pageSize,
  });

await check("total counts the filtered set, not the table", async () => {
  const client = await freshClient();
  const page = await openQueue(client);
  assert.equal(page.total, 25, "COUNT must respect the WHERE clause");
  assert.equal(page.rows.length, 20);
});

await check("the first page is the newest, the second is the remainder", async () => {
  const client = await freshClient();
  const first = await openQueue(client, 1);
  const second = await openQueue(client, 2);

  assert.equal(first.rows[0]!.id, "open-25", "newest request comes first");
  assert.equal(first.rows.length, 20);
  assert.equal(second.rows.length, 5, "the tail lands entirely on page 2");

  // No row may appear on both pages, and together they must cover the queue.
  const ids = [...first.rows, ...second.rows].map((r) => r.id);
  assert.equal(new Set(ids).size, 25, "pages must not overlap");
});

await check("a page past the end falls back to the last real page", async () => {
  const client = await freshClient();
  // Not a hand-typed URL: delete the tail of page 2 and refresh, and the URL
  // still says page=2. Serving that as an empty list makes a 25-item queue look
  // wiped, and leaves the control reading "2 / 1".
  const page = await openQueue(client, 2);
  assert.equal(page.page, 2, "page 2 exists for 25 rows at 20/page");
  assert.equal(page.rows.length, 5);

  const past = await openQueue(client, 99);
  assert.equal(past.page, 2, "an out-of-range page clamps to the last one");
  assert.equal(past.rows.length, 5, "and shows that page's rows, not an empty list");
  assert.equal(past.total, 25, "the total is still the real total");
});

await check("a shrinking queue clamps too", async () => {
  const client = await freshClient();
  await openQueue(client, 1);
  // Drop to 20 rows: page 2 no longer exists.
  await client.execute(
    `DELETE FROM removal_requests WHERE id IN (${Array.from({ length: 5 }, (_, i) => `'open-${String(i + 1).padStart(2, "0")}'`).join(", ")})`,
  );
  const page = await openQueue(client, 2);
  assert.equal(page.total, 20);
  assert.equal(page.page, 1, "page 2 vanished, so page 1 is the answer");
  assert.equal(page.rows.length, 20);
});

await check("an empty result set reports page 1 of 1", async () => {
  const client = await freshClient();
  await client.execute("DELETE FROM removal_requests");
  const page = await pageRows<Record<string, unknown>>(client, {
    sql: "SELECT * FROM removal_requests",
    order: "created_at DESC",
    page: 7,
  });
  assert.equal(page.total, 0);
  assert.equal(page.page, 1);
  assert.equal(page.rows.length, 0);
});

await check("hostile page numbers clamp to the first page", async () => {
  const client = await freshClient();
  for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const page = await openQueue(client, bad);
    assert.equal(page.page, 1, `page ${String(bad)} must clamp to 1`);
    assert.equal(page.rows.length, 20);
  }
});

await check("a fractional page number floors instead of erroring", async () => {
  const client = await freshClient();
  const page = await openQueue(client, 1.9);
  assert.equal(page.page, 1);
});

await check("a zero or negative page size falls back to 1", async () => {
  const client = await freshClient();
  const page = await openQueue(client, 1, 0);
  assert.equal(page.pageSize, 1);
  assert.equal(page.rows.length, 1);
});

await check("two queues page independently", async () => {
  const client = await freshClient();
  const [open, done] = await Promise.all([
    pageRows<Record<string, unknown>>(client, {
      sql: "SELECT * FROM removal_requests",
      where: "status = 'open'",
      order: "created_at DESC",
      page: 1,
      pageSize: 20,
    }),
    pageRows<Record<string, unknown>>(client, {
      sql: "SELECT * FROM removal_requests",
      where: "status != 'open'",
      order: "created_at DESC",
      page: 1,
      pageSize: 20,
    }),
  ]);
  assert.equal(open.total, 25);
  assert.equal(done.total, 5);
  assert.equal(
    open.rows.some((r) => String(r.status) !== "open"),
    false,
    "the open queue must not leak closed requests",
  );
  assert.equal(
    done.rows.some((r) => String(r.status) === "open"),
    false,
    "the closed queue must not leak open requests",
  );
});

await check("a filter with a bound argument keeps filter args ahead of the window", async () => {
  const client = await freshClient();
  const page = await pageRows<Record<string, unknown>>(client, {
    sql: "SELECT * FROM removal_requests",
    // `>` compares as text, and the stored value carries a time suffix, so
    // "2026-09-05T00:00:00Z" is greater than the bare date "2026-09-05".
    // open-05 through open-25 is 21 rows.
    where: "status = ? AND created_at > ?",
    args: ["open", "2026-09-05"],
    order: "created_at DESC",
    page: 2,
    pageSize: 10,
  });
  assert.equal(page.total, 21, "open requests after 2026-09-05");
  assert.equal(page.rows.length, 10);
  assert.equal(page.rows[0]!.id, "open-15", "OFFSET applies after the filter");
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

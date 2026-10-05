import assert from "node:assert/strict";
import { createClient, type Client, type InValue } from "@libsql/client";

/**
 * Regression test for `runHistoryByDay`, the series behind the admin dashboard
 * trend chart.
 *
 * The dashboard used to show four hardcoded "accuracy" bars and no throughput
 * history, so nothing on it moved unless the database did. This pins the
 * aggregation the chart now depends on against real SQLite, focusing on the
 * two ways this query can quietly lie:
 *
 *  1. Gaps. If missing days are dropped, two runs three weeks apart render as
 *     adjacent bars and the trend reads as steady when it is not.
 *  2. `stats` is a loose JSON blob written by the pipeline. It already has two
 *     names for the collected count (`collected` and the older `scraped`), it can
 *     be missing keys entirely, and a half-written or corrupt blob must not take
 *     the whole dashboard down.
 */
const DB = "file:./.tmp-run-history-test.db";

const openClients: Client[] = [];

/** ISO date `offset` days before today, so the window always covers the fixture. */
function dayAt(offset: number): string {
  return new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
}

/** Mirror of the aggregation in `runHistoryByDay`, inlined against this fixture. */
async function runHistoryByDay(client: Client, days = 14) {
  const span = Math.min(Math.max(Math.trunc(days), 1), 90);
  const since = dayAt(span - 1);
  const safe = "CASE WHEN json_valid(stats) THEN stats ELSE '{}' END";
  const res = await client.execute({
    sql: `SELECT substr(started_at, 1, 10) AS day,
                 count(*) AS runs,
                 COALESCE(sum(status = 'completed'), 0) AS completed,
                 COALESCE(sum(status = 'failed'), 0) AS failed,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.collected'),
                                        json_extract(${safe}, '$.scraped'), 0)), 0) AS collected,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.published'), 0)), 0) AS published,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.duplicatesBlocked'), 0)), 0) AS duplicates,
                 COALESCE(sum(COALESCE(json_extract(${safe}, '$.emptyText'), 0)), 0) AS empty_text
          FROM pipeline_runs
          WHERE started_at >= ?
          GROUP BY day
          ORDER BY day ASC`,
    args: [`${since}%`],
  });

  const byDay = new Map<string, Record<string, number | string>>();
  for (const r of res.rows) {
    byDay.set(String(r.day), {
      day: String(r.day),
      runs: Number(r.runs ?? 0),
      completed: Number(r.completed ?? 0),
      failed: Number(r.failed ?? 0),
      collected: Number(r.collected ?? 0),
      published: Number(r.published ?? 0),
      duplicates: Number(r.duplicates ?? 0),
      emptyText: Number(r.empty_text ?? 0),
    });
  }

  const out: Array<Record<string, number | string>> = [];
  for (let i = 0; i < span; i++) {
    const day = dayAt(span - 1 - i);
    out.push(
      byDay.get(day) ?? {
        day,
        runs: 0,
        completed: 0,
        failed: 0,
        collected: 0,
        published: 0,
        duplicates: 0,
        emptyText: 0,
      },
    );
  }
  return out;
}

async function freshClient(): Promise<Client> {
  const client = createClient({ url: DB, authToken: "local" });
  openClients.push(client);
  await client.execute("DROP TABLE IF EXISTS pipeline_runs");
  await client.batch(
    [
      `CREATE TABLE pipeline_runs (
         id TEXT PRIMARY KEY,
         status TEXT NOT NULL,
         started_at TEXT NOT NULL,
         finished_at TEXT,
         stats TEXT
       )`,
    ],
    "write",
  );
  return client;
}

type Run = [string, string, string, string | null];

async function seed(client: Client, runs: Run[]): Promise<void> {
  const values = runs
    .map(
      ([id, status, started, stats]) =>
        `('${id}','${status}','${started}T02:00:00Z','${started}T02:05:00Z',${stats === "NULL" ? "NULL" : `'${stats}'`})`,
    )
    .join(", ");
  if (values) await client.execute(`INSERT INTO pipeline_runs (id,status,started_at,finished_at,stats) VALUES ${values}`);
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

await check("the window is zero-filled to exactly the requested number of days", async () => {
  const client = await freshClient();
  const series = await runHistoryByDay(client, 14);
  assert.equal(series.length, 14, "a stable X axis means every day is present");
  assert.deepEqual(
    series.map((d) => d.day),
    Array.from({ length: 14 }, (_, i) => dayAt(13 - i)),
    "days are ascending and end today",
  );
  assert.equal(series.at(-1)!.runs, 0);
});

await check("days with no run are zeros, not missing entries", async () => {
  const client = await freshClient();
  // Only day-3-ago has a run. A dropped day would make the series look denser
  // than reality; the chart would then imply activity on the quiet days.
  await seed(client, [["a", "completed", dayAt(3), '{"collected":10,"published":4}']]);
  const series = await runHistoryByDay(client, 7);
  const quiet = series.filter((d) => d.day !== dayAt(3));
  assert.equal(quiet.length, 6, "six quiet days still occupy the axis");
  for (const d of quiet) {
    assert.equal(d.runs, 0, `${String(d.day)} must be a zero row`);
    assert.equal(d.collected, 0);
  }
});

await check("multiple runs on one day are summed", async () => {
  const client = await freshClient();
  const d = dayAt(1);
  await seed(client, [
    ["a", "completed", d, '{"collected":10,"published":4,"duplicatesBlocked":3}'],
    ["b", "completed", d, '{"collected":6,"published":1,"duplicatesBlocked":2}'],
  ]);
  const [point] = (await runHistoryByDay(client, 3)).filter((x) => x.day === d);
  assert.equal(point!.runs, 2);
  assert.equal(point!.collected, 16);
  assert.equal(point!.published, 5);
  assert.equal(point!.duplicates, 5);
  assert.equal(point!.completed, 2);
});

await check("outcome statuses are counted separately", async () => {
  const client = await freshClient();
  const d = dayAt(0);
  await seed(client, [
    ["ok", "completed", d, '{"collected":1}'],
    ["bad", "failed", d, '{"collected":1}'],
    ["live", "running", d, '{"collected":1}'],
  ]);
  const [point] = (await runHistoryByDay(client, 3)).filter((x) => x.day === d);
  assert.equal(point!.runs, 3);
  assert.equal(point!.completed, 1);
  assert.equal(point!.failed, 1);
  // A still-running attempt is neither a success nor a failure, and an operator
  // watching this chart must not see a red failure for work in flight.
  assert.equal(point!.completed + point!.failed, 2, "running is excluded from both");
});

await check("the legacy `scraped` key still feeds the collected count", async () => {
  const client = await freshClient();
  const d = dayAt(0);
  await seed(client, [
    ["old", "completed", d, '{"scraped":42,"published":7}'],
    ["new", "completed", d, '{"collected":42,"published":7}'],
  ]);
  const [point] = (await runHistoryByDay(client, 3)).filter((x) => x.day === d);
  // Both rows describe the same run shape, so either key must yield 84 total
  // rather than dropping the older half of the history to zero.
  assert.equal(point!.collected, 84);
});

await check("`collected` wins over `scraped` when both are present", async () => {
  const client = await freshClient();
  const d = dayAt(0);
  await seed(client, [["both", "completed", d, '{"collected":5,"scraped":999}']]);
  const [point] = (await runHistoryByDay(client, 3)).filter((x) => x.day === d);
  assert.equal(point!.collected, 5, "the current key takes precedence");
});

await check("a malformed stats blob degrades to zero instead of failing", async () => {
  const client = await freshClient();
  const d = dayAt(0);
  // A truncated write is the realistic corruption: json_extract throws on it.
  await seed(client, [
    ["broken", "completed", d, '{"collected":10,'],
    ["absent", "completed", d, "NULL"],
    ["healthy", "completed", d, '{"collected":3,"published":1,"emptyText":2}'],
  ]);
  const series = await runHistoryByDay(client, 3);
  const [point] = series.filter((x) => x.day === d);
  assert.equal(point!.runs, 3, "all three runs are still counted");
  assert.equal(point!.collected, 3, "only the readable blob contributes");
  assert.equal(point!.published, 1);
  assert.equal(point!.emptyText, 2, "emptyText stays visible for the readable run");
});

await check("emptyText counts are preserved for zero-rewrite runs", async () => {
  const client = await freshClient();
  const d = dayAt(0);
  await seed(client, [
    ["a", "completed", d, '{"collected":30,"published":30,"emptyText":9}'],
    ["b", "completed", d, '{"collected":20,"published":20}'],
  ]);
  const [point] = (await runHistoryByDay(client, 3)).filter((x) => x.day === d);
  assert.equal(point!.emptyText, 9);
});

await check("runs older than the window are excluded", async () => {
  const client = await freshClient();
  await seed(client, [
    ["recent", "completed", dayAt(2), '{"collected":5}'],
    ["ancient", "completed", dayAt(60), '{"collected":9999}'],
  ]);
  const series = await runHistoryByDay(client, 7);
  const total = series.reduce((n, d) => n + Number(d.collected), 0);
  assert.equal(total, 5, "the 60-day-old run is outside a 7-day window");
});

await check("the day window is clamped to a sane range", async () => {
  const client = await freshClient();
  assert.equal((await runHistoryByDay(client, 0)).length, 1, "zero days floors to 1");
  assert.equal((await runHistoryByDay(client, -3)).length, 1, "negative days floors to 1");
  assert.equal((await runHistoryByDay(client, 500)).length, 90, "an absurd window caps at 90");
  assert.equal((await runHistoryByDay(client, 7.9)).length, 7, "a fractional window floors");
});

await check("an empty table yields an all-zero series", async () => {
  const client = await freshClient();
  const series = await runHistoryByDay(client, 5);
  assert.equal(series.length, 5);
  assert.equal(
    series.reduce((n, d) => n + Number(d.runs), 0),
    0,
  );
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

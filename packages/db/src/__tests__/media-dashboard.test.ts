/**
 * Media dashboard aggregation.
 *
 * Two things matter here and both are easy to get subtly wrong: the day series
 * must be zero-filled (a missing day must read as "nothing uploaded", not vanish),
 * and the quota percentage must stay NULL when no quota is set (a 0% bar on an
 * unlimited provider looks like an empty bucket).
 */
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { __useClientForTests } from "../client";
import { migrationSql } from "../migrations";
import { fillDays, mediaDashboard, mediaProviderCount, quotaPercent } from "../media-dashboard";
import { recordProviderFailure, recordProviderSuccess, registerProvider } from "../provider-health";
import { recordMediaObject } from "../media-objects";

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

const client = createClient({ url: ":memory:" });
__useClientForTests(client);
for (const name of ["001_init", "029_media_provider_health"]) {
  const ddl = migrationSql(name);
  assert.ok(ddl, `migration ${name} must exist`);
  const statements = ddl
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
  for (const stmt of statements) await client.execute(stmt);
}
await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS media_objects (
  id TEXT PRIMARY KEY, adapter TEXT NOT NULL, key TEXT NOT NULL, url TEXT NOT NULL,
  post_id TEXT, bytes INTEGER, created_at TEXT NOT NULL
);`);

await check("no quota means no percentage, not zero percent", () => {
  assert.equal(quotaPercent(500, null), null);
  assert.equal(quotaPercent(500, 0), null);
  assert.equal(quotaPercent(50, 100), 50);
  assert.equal(quotaPercent(150, 100), 100, "clamped, never over 100");
});

await check("the day series is zero-filled and ordered oldest first", () => {
  const now = new Date("2026-03-10T12:00:00.000Z");
  const series = fillDays([{ day: "2026-03-08", bytes: 10, files: 1 }], 3, now);
  assert.deepEqual(
    series.map((d) => d.day),
    ["2026-03-08", "2026-03-09", "2026-03-10"],
  );
  assert.equal(series[0]?.bytes, 10);
  assert.equal(series[1]?.bytes, 0, "a quiet day is a zero, not a gap");
});

await check("an empty registry reports honestly", async () => {
  const dash = await mediaDashboard();
  assert.equal(dash.totals.providers, 0);
  assert.match(dash.headline, /নিবন্ধিত নয়/);
  assert.equal(await mediaProviderCount(), 0);
});

await registerProvider({ key: "github:owner/media", kind: "github", label: "GitHub media" });
await registerProvider({ key: "s3:backblaze:media", kind: "s3", label: "B2" });
await recordProviderSuccess("github:owner/media", 4_194_304);
await recordProviderSuccess("github:owner/media", 1_048_576);
await recordProviderFailure("s3:backblaze:media", "401");
await recordProviderFailure("s3:backblaze:media", "401");
await recordMediaObject({ adapter: "github:owner/media", key: "media/a.jpg", url: "https://cdn/a.jpg", bytes: 4_194_304 });
await recordMediaObject({ adapter: "github:owner/media", key: "media/b.jpg", url: "https://cdn/b.jpg", bytes: 1_048_576 });

await check("the dashboard totals come from the counters, not a guess", async () => {
  const dash = await mediaDashboard();
  assert.equal(dash.providers.length, 2);
  const gh = dash.providers.find((p) => p.key === "github:owner/media")!;
  assert.equal(gh.usedBytes, 5_242_880);
  assert.equal(gh.objects, 2);
  assert.equal(gh.state, "ok");
  assert.equal(dash.totals.bytes, 5_242_880);
  assert.equal(dash.totals.objects, 2);
});

await check("a cooling provider is surfaced in the headline", async () => {
  const dash = await mediaDashboard();
  const b2 = dash.providers.find((p) => p.key === "s3:backblaze:media")!;
  assert.equal(b2.state, "cooldown");
  assert.equal(dash.totals.cooldown, 1);
  assert.match(dash.headline, /বিরতিতে/);
  assert.equal(b2.quotaPercent, null, "no quota configured yet");
});

await check("each card carries its own 14-day series", async () => {
  const dash = await mediaDashboard();
  const gh = dash.providers.find((p) => p.key === "github:owner/media")!;
  assert.equal(gh.series.length, 14);
  assert.equal(gh.series.reduce((a, d) => a + d.bytes, 0), 5_242_880);
});

await check("a quota shows as a percentage and flags the state", async () => {
  await client.execute(
    "UPDATE media_provider_health SET quota_bytes = 10485760 WHERE provider_key = 'github:owner/media'",
  );
  const dash = await mediaDashboard();
  const gh = dash.providers.find((p) => p.key === "github:owner/media")!;
  assert.equal(gh.quotaPercent, 50);
  assert.equal(dash.totals.hasQuota, true);

  await client.execute(
    "UPDATE media_provider_health SET quota_bytes = 5242880 WHERE provider_key = 'github:owner/media'",
  );
  const full = await mediaDashboard();
  assert.equal(full.providers.find((p) => p.key === "github:owner/media")!.state, "quota_exceeded");
  assert.match(full.headline, /কোটা শেষ/);
});

console.log(`[db] media-dashboard: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const DB = path.join(process.cwd(), ".tmp-ad-analytics-test.db");

async function removeTestFiles(): Promise<void> {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${DB}${suffix}`;
    for (let attempt = 0; ; attempt += 1) {
      try {
        fs.rmSync(file, { force: true });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EPERM" || attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }
}

async function main(): Promise<void> {
  await removeTestFiles();
  process.env.TURSO_DATABASE_URL = `file:${DB}`;
  process.env.TURSO_AUTH_TOKEN = "local";

  const { getClient } = await import("../client");
  const ads = await import("../ads");
  const client = getClient();
  try {
    await client.batch([
      `CREATE TABLE ad_bookings (
        id TEXT PRIMARY KEY, client_id TEXT NOT NULL, creative_id TEXT NOT NULL, slot_key TEXT NOT NULL,
        status TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT '', impressions INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE ad_events (
        id TEXT PRIMARY KEY, slot TEXT NOT NULL, event TEXT NOT NULL, post_id TEXT, path TEXT,
        session_id TEXT, visitor_id TEXT, country TEXT, created_at TEXT NOT NULL
      )`,
      `CREATE TABLE platform_ad_events (
        id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, slot_key TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('impression', 'click')),
        path TEXT, device TEXT, created_at TEXT NOT NULL
      )`,
      "CREATE TABLE ad_slots (slot_key TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1)",
      "CREATE TABLE ad_clients (id TEXT PRIMARY KEY, status TEXT NOT NULL)",
      `CREATE TABLE ad_creatives (
        id TEXT PRIMARY KEY, client_id TEXT, name TEXT NOT NULL, template_id TEXT NOT NULL,
        palette TEXT NOT NULL, data_json TEXT NOT NULL, style_json TEXT NOT NULL, layout_json TEXT NOT NULL,
        base_lang TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`,
      "INSERT INTO ad_slots (slot_key, enabled) VALUES ('home-top', 1)",
      "INSERT INTO ad_events (id, slot, event, created_at) VALUES ('legacy-ad', 'leaderboard', 'view', 'now')",
      "INSERT INTO ad_clients (id, status) VALUES ('client-a', 'approved'), ('client-b', 'approved')",
      `INSERT INTO ad_creatives
        (id, client_id, name, template_id, palette, data_json, style_json, layout_json, base_lang, created_at, updated_at)
        VALUES ('creative-a', 'client-a', 'A', 'leaderboard', 'newsprint', '{}', '{}', '{}', 'bn', 'now', 'now'),
               ('creative-b', 'client-b', 'B', 'leaderboard', 'newsprint', '{}', '{}', '{}', 'bn', 'now', 'now')`,
      `INSERT INTO ad_bookings (id, client_id, creative_id, slot_key, status, starts_at, ends_at, priority, created_at) VALUES
        ('booking-a', 'client-a', 'creative-a', 'home-top', 'active', '2000-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', 2, '2026-01-01'),
        ('booking-b', 'client-b', 'creative-b', 'home-top', 'active', '2000-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', 1, '2026-01-01')`,
    ], "write");

    await ads.recordAdDeliveryEvent({ bookingId: "booking-a", slotKey: "home-top", kind: "impression", path: "/", device: "desktop" });
    await ads.recordAdDeliveryEvent({ bookingId: "booking-a", slotKey: "home-top", kind: "click", path: "/", device: "desktop" });
    await ads.recordAdDeliveryEvent({ bookingId: "booking-b", slotKey: "home-top", kind: "impression" });
    assert.equal((await ads.getActiveAdForSlot("home-top"))?.bookingId, "booking-a");
    await client.execute("UPDATE ad_clients SET status = 'suspended' WHERE id = 'client-a'");
    assert.equal((await ads.getActiveAdForSlot("home-top"))?.bookingId, "booking-b");

    const stored = await client.execute("SELECT booking_id FROM platform_ad_events ORDER BY kind");
    assert.deepEqual(stored.rows.map((row) => row.booking_id), ["booking-a", "booking-a", "booking-b"]);
    assert.equal(Number((await client.execute("SELECT COUNT(*) AS count FROM ad_events")).rows[0]?.count), 1);

    const bookingCounts = await client.execute("SELECT impressions, clicks FROM ad_bookings WHERE id = 'booking-a'");
    assert.equal(Number(bookingCounts.rows[0]?.impressions), 1);
    assert.equal(Number(bookingCounts.rows[0]?.clicks), 1);

    const clientDays = await ads.getAdAnalytics("client-a");
    assert.equal(clientDays.length, 14);
    assert.equal(clientDays.reduce((sum, day) => sum + day.impressions, 0), 1);
    assert.equal(clientDays.reduce((sum, day) => sum + day.clicks, 0), 1);
    const scopedEvents = await ads.listAdEvents("client-a");
    assert.equal(scopedEvents.length, 2);
    assert.ok(scopedEvents.every((event) => event.bookingId === "booking-a"));
    assert.equal((await ads.listAdEvents()).length, 3);

    console.log("ad analytics checks passed");
  } finally {
    await client.close();
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    await removeTestFiles();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

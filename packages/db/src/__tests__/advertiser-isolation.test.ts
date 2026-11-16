/**
 * Advertiser isolation.
 *
 * Two advertisers exist in these checks and neither may ever see the other's
 * rows. The point is not that a page *currently* passes the right id — it is
 * that the reader cannot be called without one. `clientId?: string` with an
 * "everything" default is the kind of API that leaks on the day someone adds a
 * page and forgets an argument, and leaves nothing in the logs when it does.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@libsql/client";
import { applyMigration } from "../client";
import { listMigrations, migrationSql } from "../migrations";

const DB = path.join(process.cwd(), ".tmp-advertiser-isolation.db");

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

await removeTestFiles();
// File-backed: the writers below use transactions, and libsql opens a second,
// empty connection for a transaction on `:memory:`.
process.env.TURSO_DATABASE_URL = `file:${DB}`;
process.env.TURSO_AUTH_TOKEN = "local";

const bootstrap = createClient({ url: `file:${DB}` });
// The real migrations, in order, up to and including the ad-slot expansion: the
// checks below depend on the actual column defaults, not a hand-drawn schema.
for (const name of listMigrations().map((m) => m.name)) {
  if (name > "021" && name !== "021_ad_slot_inventory_expansion") break;
  const ddl = migrationSql(name);
  if (ddl) await applyMigration(bootstrap, name, ddl).catch(() => undefined);
}

const {
  createAdBooking,
  createAdCreative,
  getAdAnalytics,
  getAllAdAnalytics,
  listAdBookings,
  listAdCreatives,
  listAdEvents,
  listAllAdBookings,
  listAllAdCreatives,
  listAllAdEvents,
  recordAdDeliveryEvent,
  updateAdCreative,
} = await import("../ads");

const sql = bootstrap;
async function seed(): Promise<void> {
  const now = new Date().toISOString();
  for (const [id, email] of [
    ["client-a", "a@adv.example"],
    ["client-b", "b@adv.example"],
  ] as const) {
    await sql.execute({
      sql: `INSERT INTO ad_clients (id, name, company, email, role, status, credit_bdt, created_at, updated_at)
            VALUES (?, ?, NULL, ?, 'client', 'approved', 0, ?, ?)`,
      args: [id, id, email, now, now],
    });
  }
  await sql.execute({
    sql: `INSERT INTO ad_slots (slot_key, name, description, enabled, day_rate_bdt, house_html_enabled, delivery_mode, updated_at)
          VALUES ('home-hero', 'হোম হিরো', NULL, 1, 5000, 0, 'platform', ?)`,
    args: [now],
  });
}
await seed();

const creativeA = await createAdCreative({ clientId: "client-a", name: "A creative", templateId: "banner", data: { headline: "A" } });
const creativeB = await createAdCreative({ clientId: "client-b", name: "B creative", templateId: "banner", data: { headline: "B" } });

const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const bookingA = await createAdBooking({
  clientId: "client-a", creativeId: creativeA.id, slotKey: "home-hero",
  startsAt, endsAt, days: 1, grossBdt: 5000, discountBdt: 0, vatBdt: 0, totalBdt: 5000,
});
const bookingB = await createAdBooking({
  clientId: "client-b", creativeId: creativeB.id, slotKey: "home-hero",
  startsAt, endsAt, days: 1, grossBdt: 5000, discountBdt: 0, vatBdt: 0, totalBdt: 5000,
});
await sql.execute({ sql: "UPDATE ad_bookings SET status = 'active' WHERE id IN (?, ?)", args: [bookingA.id, bookingB.id] });

await check("creatives are scoped to their own advertiser", async () => {
  const a = await listAdCreatives("client-a");
  assert.deepEqual(a.map((c) => c.id), [creativeA.id]);
  const zero = await listAdCreatives("client-does-not-exist");
  assert.equal(zero.length, 0, "an unknown id must return nothing, not everything");
});

await check("bookings are scoped to their own advertiser", async () => {
  assert.deepEqual((await listAdBookings("client-a")).map((b) => b.id), [bookingA.id]);
  assert.deepEqual((await listAdBookings("client-b")).map((b) => b.id), [bookingB.id]);
  assert.equal((await listAdBookings("")).length, 0);
});

await check("delivery analytics count only the caller's own events", async () => {
  await recordAdDeliveryEvent({ bookingId: bookingA.id, slotKey: "home-hero", kind: "impression" });
  await recordAdDeliveryEvent({ bookingId: bookingA.id, slotKey: "home-hero", kind: "click" });
  await recordAdDeliveryEvent({ bookingId: bookingB.id, slotKey: "home-hero", kind: "impression" });

  const own = await getAdAnalytics("client-a");
  assert.deepEqual(own.map((d) => d.impressions + d.clicks).reduce((a, b) => a + b, 0), 2);

  const events = await listAdEvents("client-a");
  assert.equal(events.length, 2, "B's impression must not appear in A's event list");
  assert.ok(events.every((e) => e.bookingId === bookingA.id));
});

await check("the admin view still sees everyone", async () => {
  assert.equal((await listAllAdCreatives()).length, 2);
  assert.equal((await listAllAdBookings()).length, 2);
  assert.equal((await listAllAdEvents()).length, 3);
  const total = (await getAllAdAnalytics()).map((d) => d.impressions + d.clicks).reduce((a, b) => a + b, 0);
  assert.equal(total, 3);
});

await check("editing another advertiser's creative is refused", async () => {
  await assert.rejects(
    () => updateAdCreative({ id: creativeB.id, clientId: "client-a", name: "hijack", templateId: "banner", palette: "newsprint", data: {} }),
    /পাওয়া যায়নি/,
  );
  const own = await listAdCreatives("client-b");
  assert.equal(own.length, 1);
  assert.equal(own[0]?.name, "B creative", "the row must be untouched");
});

await check("booking another advertiser's creative is refused at the data layer", async () => {
  await assert.rejects(
    () =>
      createAdBooking({
        clientId: "client-a", creativeId: creativeB.id, slotKey: "home-hero",
        startsAt, endsAt, days: 1, grossBdt: 5000, discountBdt: 0, vatBdt: 0, totalBdt: 5000,
      }),
    /আপনার অ্যাকাউন্টে নেই/,
  );
});

await check("deleting a client cannot orphan a foreign creative into view", async () => {
  // A scoped read after the row is gone must be empty, never a full listing.
  await sql.execute({ sql: "UPDATE ad_creatives SET client_id = NULL WHERE id = ?", args: [creativeA.id] });
  const unowned = await listAdCreatives("client-a");
  assert.equal(unowned.length, 0, "an unowned creative must not fall into any advertiser's list");
});

// Windows keeps the file handle open until the client is collected; a failed
// cleanup must not disguise a passing run.
await removeTestFiles().catch(() => undefined);
console.log(`[db] advertiser isolation: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

/**
 * Invoice and payment capture.
 *
 * The rules that make this trustworthy are all refusals: an invoice can only be
 * issued against a booking that belongs to the client, a payment cannot exceed
 * what is outstanding, the same bank reference cannot be booked twice, and void
 * is a flag that keeps the row and the number. Status is derived from the
 * payment sums, so a status column cannot drift from the ledger.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@libsql/client";
import { applyMigration } from "../client";
import { listMigrations, migrationSql } from "../migrations";

const DB = path.join(process.cwd(), ".tmp-ad-invoices.db");

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    const e = err as Error;
    console.error(`FAIL ${name}: ${e.message}`);
    if (process.env.SHOW_STACK) console.error(e.stack);
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
process.env.TURSO_DATABASE_URL = `file:${DB}`;
process.env.TURSO_AUTH_TOKEN = "local";

const bootstrap = createClient({ url: `file:${DB}` });
for (const name of listMigrations().map((m) => m.name)) {
  if (name > "033" && name !== "033_ad_invoices") break;
  const ddl = migrationSql(name);
  if (ddl) await applyMigration(bootstrap, name, ddl).catch(() => undefined);
}

const {
  invoiceBalance,
  issueInvoice,
  listAllInvoices,
  listInvoices,
  paymentsForInvoice,
  recordPayment,
  voidInvoice,
} = await import("../ad-invoices");

const now = new Date().toISOString();
await bootstrap.execute({
  sql: `INSERT INTO ad_clients (id, name, company, email, role, status, credit_bdt, created_at, updated_at)
        VALUES ('client-a', 'A', NULL, 'a@adv.example', 'client', 'approved', 0, ?, ?),
               ('client-b', 'B', NULL, 'b@adv.example', 'client', 'approved', 0, ?, ?)`,
  args: [now, now, now, now],
});
await bootstrap.execute({
  sql: `INSERT INTO ad_slots (slot_key, name, description, enabled, day_rate_bdt, house_html_enabled, delivery_mode, updated_at)
        VALUES ('home-hero', 'হোম হিরো', NULL, 1, 5000, 0, 'platform', ?)`,
  args: [now],
});
await bootstrap.execute({
  sql: `INSERT INTO ad_creatives (id, client_id, name, template_id, palette, data_json, style_json, layout_json, base_lang, created_at, updated_at)
        VALUES ('cr-a', 'client-a', 'A', 'banner', 'newsprint', '{}', '{}', '{}', 'bn', ?, ?)`,
  args: [now, now],
});
await bootstrap.execute({
  sql: `INSERT INTO ad_bookings (id, client_id, creative_id, slot_key, starts_at, ends_at, days, status, priority, gross_bdt, discount_bdt, vat_bdt, total_bdt, impressions, clicks, created_at, updated_at)
        VALUES ('bk-a', 'client-a', 'cr-a', 'home-hero', ?, ?, 1, 'active', 0, 5000, 0, 0, 5000, 0, 0, ?, ?)`,
  args: [now, now, now, now],
});

await check("an invoice gets a stable, monotonic, year-prefixed number", async () => {
  const first = await issueInvoice({ clientId: "client-a", bookingId: "bk-a", subtotalBdt: 5000, createdBy: "admin@x" });
  const year = new Date().getUTCFullYear();
  assert.equal(first.invoiceNo, `HC-${year}-0001`);
  assert.equal(first.totalBdt, 5000);
  assert.equal(first.status, "issued");
  assert.equal(first.paidBdt, 0);

  const second = await issueInvoice({ clientId: "client-b", subtotalBdt: 1200, createdBy: "admin@x" });
  assert.equal(second.invoiceNo, `HC-${year}-0002`);
});

await check("VAT is added to the total, and zero is a real zero", async () => {
  const invoiced = await issueInvoice({ clientId: "client-b", subtotalBdt: 1000, vatBdt: 150, createdBy: "admin@x" });
  assert.equal(invoiced.vatBdt, 150);
  assert.equal(invoiced.totalBdt, 1150);
});

await check("a booking belonging to another client cannot be invoiced", async () => {
  await assert.rejects(
    () => issueInvoice({ clientId: "client-b", bookingId: "bk-a", subtotalBdt: 100, createdBy: "admin@x" }),
    /এই ক্লায়েন্টের নয়/,
  );
});

await check("the same booking cannot be invoiced twice while the first is live", async () => {
  await assert.rejects(
    () => issueInvoice({ clientId: "client-a", bookingId: "bk-a", subtotalBdt: 100, createdBy: "admin@x" }),
    /ইতিমধ্যে একটি সক্রিয় ইনভয়েস/,
  );
});

const invoiceA = (await listInvoices("client-a"))[0];
if (!invoiceA) throw new Error("client-a must have an invoice at this point");

await check("a payment cannot exceed what is outstanding", async () => {
  await assert.rejects(
    () => recordPayment({ invoiceId: invoiceA.id, amountBdt: 6000, method: "bank_transfer", recordedBy: "admin@x" }),
    /এর বেশি নথিভুক্ত করা যাবে না/,
  );
});

await check("a partial payment keeps the invoice open and records the money", async () => {
  const after = await recordPayment({
    invoiceId: invoiceA.id, amountBdt: 2000, method: "bkash", reference: "BK-1", recordedBy: "admin@x",
  });
  assert.equal(after.status, "issued");
  assert.equal(after.paidBdt, 2000);
  assert.equal((await paymentsForInvoice(invoiceA.id)).length, 1);
});

await check("the same reference cannot be booked twice", async () => {
  await assert.rejects(
    () => recordPayment({ invoiceId: invoiceA.id, amountBdt: 1000, method: "bkash", reference: "BK-1", recordedBy: "admin@x" }),
    /রেফারেন্স নম্বর দিয়ে ইতিমধ্যে/,
  );
});

await check("covering the total marks the invoice paid, from the ledger", async () => {
  const after = await recordPayment({
    invoiceId: invoiceA.id, amountBdt: 3000, method: "bank_transfer", reference: "TRX-9", recordedBy: "admin@x",
  });
  assert.equal(after.status, "paid");
  assert.equal(after.paidBdt, 5000);
  const balance = await invoiceBalance("client-a");
  assert.deepEqual(balance, { issued: 5000, paid: 5000, open: 0 });
});

await check("nothing more can be booked against a settled invoice", async () => {
  await assert.rejects(
    () => recordPayment({ invoiceId: invoiceA.id, amountBdt: 1, method: "cash", recordedBy: "admin@x" }),
    /এর বেশি নথিভুক্ত/,
  );
});

await check("a settled invoice cannot be voided", async () => {
  await assert.rejects(
    () => voidInvoice({ id: invoiceA.id, reason: "ভুল করে শূন্য করার চেষ্টা", by: "admin@x" }),
    /পরিশোধিত ইনভয়েস শূন্য করা যায় না/,
  );
});

await check("void keeps the row, the number, and refuses further money", async () => {
  const b = await listInvoices("client-b");
  const target = b.find((i) => i.status === "issued");
  if (!target) throw new Error("client-b must have an open invoice");
  const before = (await listInvoices("client-b")).length;
  await assert.rejects(() => voidInvoice({ id: target.id, reason: "no", by: "admin@x" }), /কমপক্ষে ৫ অক্ষর/);
  const voided = await voidInvoice({ id: target.id, reason: "ভুল বুকিংয়ে তৈরি হয়েছিল", by: "admin@x" });
  assert.equal(voided.status, "void");
  assert.equal(voided.invoiceNo, target.invoiceNo, "the number must survive");
  assert.equal((await listInvoices("client-b")).length, before, "void must not delete");
  await assert.rejects(
    () => recordPayment({ invoiceId: target.id, amountBdt: 100, method: "cash", recordedBy: "admin@x" }),
    /void/,
  );
});

await check("portals see only their own invoices; the admin sees all", async () => {
  const b = await listInvoices("client-b");
  assert.ok(b.length >= 2);
  assert.ok(b.every((i) => i.clientId === "client-b"));
  const none = await listInvoices("client-nobody");
  assert.equal(none.length, 0, "an unknown id must return nothing, not everything");
  assert.ok((await listAllInvoices()).length >= 3);
});

await check("a negative or fractional amount is refused", async () => {
  const fresh = await issueInvoice({ clientId: "client-b", subtotalBdt: 500, createdBy: "admin@x" });
  await assert.rejects(() => recordPayment({ invoiceId: fresh.id, amountBdt: 0, method: "cash", recordedBy: "x" }), /positive/);
  await assert.rejects(() => recordPayment({ invoiceId: fresh.id, amountBdt: 1.5, method: "cash", recordedBy: "x" }), /positive/);
  await assert.rejects(() => issueInvoice({ clientId: "client-b", subtotalBdt: 0, createdBy: "x" }), /positive/);
});

// Windows keeps the handle until the client is collected.
await removeTestFiles().catch(() => undefined);
console.log(`[db] ad invoices: ${passed} checks passed`);
process.exit(process.exitCode ?? 0);

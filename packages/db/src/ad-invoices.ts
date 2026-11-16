import { getClient } from "./client";

/**
 * Manual invoice and payment capture.
 *
 * Money here only ever appears because an operator recorded it: issueInvoice
 * creates a receivable, recordPayment books money against it, and neither
 * function can be imitated by a client request. Status is derived from payment
 * sums — `paid` means the recorded payments cover the total — so a status column
 * cannot drift from the ledger. Overpayment is refused outright.
 */

export type InvoiceStatus = "issued" | "paid" | "void";
export type PaymentMethod = "bank_transfer" | "bkash" | "nagad" | "cash" | "cheque" | "other";

export interface AdInvoice {
  id: string;
  invoiceNo: string;
  clientId: string;
  bookingId: string | null;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string | null;
  subtotalBdt: number;
  vatBdt: number;
  totalBdt: number;
  currency: string;
  notes: string | null;
  voidReason: string | null;
  paidBdt: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdPayment {
  id: string;
  invoiceId: string;
  amountBdt: number;
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
  recordedBy: string | null;
  createdAt: string;
}

const INVOICE_YEAR_PREFIX = "HC";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Allocate the next invoice number for a year, monotonically, under the UNIQUE
 * constraint: `HC-<year>-0001`.
 *
 * The counter column holds "the next number available". On the first invoice of
 * a year no row exists yet, so it is created with 2 (1 having been consumed) —
 * which means the UPDATE path must hand back `next_no - 1`, not `next_no`, or
 * the second invoice of the year silently skips 0002.
 */
async function nextInvoiceNumber(year: number, client: Awaited<ReturnType<typeof getClient>>): Promise<string> {
  const bump = await client.execute({
    sql: "UPDATE ad_invoice_counters SET next_no = next_no + 1 WHERE year = ? RETURNING next_no",
    args: [year],
  });
  let sequence: number;
  if (bump.rows.length > 0) {
    sequence = Number((bump.rows[0] as Record<string, unknown>).next_no) - 1;
  } else {
    sequence = 1;
    await client.execute({
      sql: "INSERT INTO ad_invoice_counters (year, next_no) VALUES (?, ?)",
      args: [year, 2],
    });
  }
  return `${INVOICE_YEAR_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

function mapInvoice(row: Record<string, unknown>, paidBdt: number): AdInvoice {
  return {
    id: String(row.id),
    invoiceNo: String(row.invoice_no),
    clientId: String(row.client_id),
    bookingId: row.booking_id ? String(row.booking_id) : null,
    status: String(row.status) as InvoiceStatus,
    issuedAt: String(row.issued_at),
    dueAt: row.due_at ? String(row.due_at) : null,
    subtotalBdt: Number(row.subtotal_bdt),
    vatBdt: Number(row.vat_bdt),
    totalBdt: Number(row.total_bdt),
    currency: String(row.currency),
    notes: row.notes ? String(row.notes) : null,
    voidReason: row.void_reason ? String(row.void_reason) : null,
    paidBdt,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function withPaidTotals(
  rows: Record<string, unknown>[],
  client: Awaited<ReturnType<typeof getClient>>,
): Promise<AdInvoice[]> {
  const invoices: AdInvoice[] = [];
  for (const row of rows) {
    const sums = await client.execute({
      sql: "SELECT COALESCE(SUM(amount_bdt), 0) AS paid FROM ad_payments WHERE invoice_id = ?",
      args: [String(row.id)],
    });
    invoices.push(mapInvoice(row, Number((sums.rows[0] as Record<string, unknown>).paid)));
  }
  return invoices;
}

export async function issueInvoice(input: {
  clientId: string;
  bookingId?: string | null;
  subtotalBdt: number;
  vatBdt?: number;
  dueAt?: string | null;
  notes?: string | null;
  createdBy: string;
}): Promise<AdInvoice> {
  const client = getClient();
  if (!Number.isInteger(input.subtotalBdt) || input.subtotalBdt <= 0) {
    throw new Error("invoice subtotal must be a positive whole number of taka");
  }
  const vat = Number.isInteger(input.vatBdt) && (input.vatBdt ?? 0) > 0 ? (input.vatBdt ?? 0) : 0;
  const total = input.subtotalBdt + vat;

  // The booking must belong to a real client; a stale foreign id becomes a real
  // invoice to the wrong mailbox.
  if (input.bookingId) {
    const booking = await client.execute({
      sql: "SELECT 1 AS ok FROM ad_bookings WHERE id = ? AND client_id = ?",
      args: [input.bookingId, input.clientId],
    });
    if (!booking.rows.length) throw new Error("বুকিংটি এই ক্লায়েন্টের নয়।");
  }

  // A single invoice per non-voided booking keeps the ledger readable; a second
  // issue for the same booking is a mistake, not a feature. Checked before the
  // number is allocated so a rejected issue does not burn an invoice number.
  if (input.bookingId) {
    const existing = await client.execute({
      sql: "SELECT 1 AS ok FROM ad_invoices WHERE booking_id = ? AND status != 'void'",
      args: [input.bookingId],
    });
    if (existing.rows.length) {
      throw new Error("এই বুকিংয়ের জন্য ইতিমধ্যে একটি সক্রিয় ইনভয়েস আছে।");
    }
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const invoiceNo = await nextInvoiceNumber(new Date().getUTCFullYear(), client);

  await client.execute({
    sql: `INSERT INTO ad_invoices
      (id, invoice_no, client_id, booking_id, status, issued_at, due_at, subtotal_bdt, vat_bdt, total_bdt, currency, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, 'BDT', ?, ?, ?, ?)`,
    args: [id, invoiceNo, input.clientId, input.bookingId || null, now, input.dueAt || null, input.subtotalBdt, vat, total, input.notes || null, input.createdBy, now, now],
  });
  const row = (await client.execute({ sql: "SELECT * FROM ad_invoices WHERE id = ?", args: [id] })).rows[0] as Record<string, unknown>;
  return (await withPaidTotals([row], client))[0] as AdInvoice;
}

async function effectiveStatus(
  invoice: AdInvoice,
  client: Awaited<ReturnType<typeof getClient>>,
): Promise<{ status: InvoiceStatus; paidBdt: number }> {
  const sums = await client.execute({
    sql: "SELECT COALESCE(SUM(amount_bdt), 0) AS paid FROM ad_payments WHERE invoice_id = ?",
    args: [invoice.id],
  });
  const paid = Number((sums.rows[0] as Record<string, unknown>).paid);
  if (invoice.status === "void") return { status: "void", paidBdt: paid };
  return { status: paid >= invoice.totalBdt ? "paid" : "issued", paidBdt: paid };
}

/** Advertiser-scoped read — required id, same rule as every portal reader. */
export async function listInvoices(clientId: string): Promise<AdInvoice[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM ad_invoices WHERE client_id = ? ORDER BY issued_at DESC",
    args: [clientId],
  });
  return withPaidTotals(res.rows as Record<string, unknown>[], client);
}

/** Admin console only. */
export async function listAllInvoices(): Promise<AdInvoice[]> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM ad_invoices ORDER BY issued_at DESC");
  return withPaidTotals(res.rows as Record<string, unknown>[], client);
}

export async function getInvoice(id: string, clientId: string): Promise<AdInvoice | null> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM ad_invoices WHERE id = ? AND client_id = ?",
    args: [id, clientId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return ((await withPaidTotals([row], client))[0] ?? null) as AdInvoice | null;
}

export async function recordPayment(input: {
  invoiceId: string;
  amountBdt: number;
  method: PaymentMethod;
  reference?: string | null;
  receivedAt?: string | null;
  recordedBy: string;
}): Promise<AdInvoice> {
  const client = getClient();
  if (!Number.isInteger(input.amountBdt) || input.amountBdt <= 0) {
    throw new Error("payment amount must be a positive whole number of taka");
  }
  const invoiceRow = (await client.execute({
    sql: "SELECT * FROM ad_invoices WHERE id = ?",
    args: [input.invoiceId],
  })).rows[0] as Record<string, unknown> | undefined;
  if (!invoiceRow) throw new Error("ইনভয়েসটি পাওয়া যায়নি।");
  const invoice = mapInvoice(invoiceRow, 0);
  if (invoice.status === "void") throw new Error("শূন্য (void) ইনভয়েসে পেমেন্ট নথিভুক্ত করা যায় না।");
  if (invoice.currency !== "BDT") throw new Error("শুধু BDT ইনভয়েসে পেমেন্ট নথিভুক্ত করা যায়।");

  const sums = await client.execute({
    sql: "SELECT COALESCE(SUM(amount_bdt), 0) AS paid FROM ad_payments WHERE invoice_id = ?",
    args: [invoice.id],
  });
  const paidSoFar = Number((sums.rows[0] as Record<string, unknown>).paid);
  const remaining = invoice.totalBdt - paidSoFar;
  if (input.amountBdt > remaining) {
    throw new Error(`বাকি ${remaining} টাকা — এর বেশি নথিভুক্ত করা যাবে না।`);
  }

  const id = crypto.randomUUID();
  const receivedAt = input.receivedAt || nowIso();
  await insertPayment(client, {
    id,
    invoiceId: invoice.id,
    amountBdt: input.amountBdt,
    method: input.method,
    reference: input.reference?.trim() || null,
    receivedAt,
    recordedBy: input.recordedBy,
  });
  const fresh = (await client.execute({ sql: "SELECT * FROM ad_invoices WHERE id = ?", args: [invoice.id] })).rows[0] as Record<string, unknown>;
  const { status, paidBdt } = await effectiveStatus(mapInvoice(fresh, 0), client);
  await client.execute({
    sql: "UPDATE ad_invoices SET status = ?, updated_at = ? WHERE id = ?",
    args: [status, nowIso(), invoice.id],
  });
  return mapInvoice({ ...fresh, status }, paidBdt);
}

/**
 * The duplicate-reference rule is a UNIQUE index, so its violation arrives as a
 * raw SQLite string. An operator needs to read "this reference is already
 * booked", not `SQLITE_CONSTRAINT_UNIQUE`.
 */
async function insertPayment(
  client: Awaited<ReturnType<typeof getClient>>,
  payment: {
    id: string;
    invoiceId: string;
    amountBdt: number;
    method: PaymentMethod;
    reference: string | null;
    receivedAt: string;
    recordedBy: string;
  },
): Promise<void> {
  try {
    await client.execute({
      sql: `INSERT INTO ad_payments (id, invoice_id, amount_bdt, method, reference, received_at, recorded_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        payment.id,
        payment.invoiceId,
        payment.amountBdt,
        payment.method,
        payment.reference,
        payment.receivedAt,
        payment.recordedBy,
        nowIso(),
      ],
    });
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed:\s*ad_payments\.invoice_id, ad_payments\.reference/i.test(error.message)) {
      throw new Error("এই রেফারেন্স নম্বর দিয়ে ইতিমধ্যে একটি পেমেন্ট নথিভুক্ত আছে।");
    }
    throw error;
  }
}

export async function paymentsForInvoice(invoiceId: string): Promise<AdPayment[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM ad_payments WHERE invoice_id = ? ORDER BY received_at DESC",
    args: [invoiceId],
  });
  return res.rows.map((row) => ({
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    amountBdt: Number(row.amount_bdt),
    method: String(row.method) as PaymentMethod,
    reference: row.reference ? String(row.reference) : null,
    receivedAt: String(row.received_at),
    recordedBy: row.recorded_by ? String(row.recorded_by) : null,
    createdAt: String(row.created_at),
  }));
}


/** Every payment a given advertiser has made — required scope, like the rest. */
export async function listPaymentsForClient(clientId: string): Promise<AdPayment[]> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT p.* FROM ad_payments p
      JOIN ad_invoices i ON i.id = p.invoice_id
      WHERE i.client_id = ?
      ORDER BY p.received_at DESC`,
    args: [clientId],
  });
  return res.rows.map((row) => ({
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    amountBdt: Number(row.amount_bdt),
    method: String(row.method) as PaymentMethod,
    reference: row.reference ? String(row.reference) : null,
    receivedAt: String(row.received_at),
    recordedBy: row.recorded_by ? String(row.recorded_by) : null,
    createdAt: String(row.created_at),
  }));
}

/** Void flags, never deletes: the number must keep existing. */
export async function voidInvoice(input: { id: string; reason: string; by: string }): Promise<AdInvoice> {
  const client = getClient();
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("শূন্য করার কারণ কমপক্ষে ৫ অক্ষরের হতে হবে।");
  // A settled invoice is not voidable: the money is already recorded, and
  // voiding it would leave payments against a document that no longer counts.
  const current = (await client.execute({
    sql: "SELECT status FROM ad_invoices WHERE id = ?",
    args: [input.id],
  })).rows[0] as Record<string, unknown> | undefined;
  if (!current) throw new Error("ইনভয়েসটি পাওয়া যায়নি।");
  if (String(current.status) === "paid") {
    throw new Error("পরিশোধিত ইনভয়েস শূন্য করা যায় না — আগে পেমেন্ট রেকর্ডটি দেখুন।");
  }
  const res = await client.execute({
    sql: "UPDATE ad_invoices SET status = 'void', void_reason = ?, updated_at = ? WHERE id = ? AND status != 'void'",
    args: [reason, nowIso(), input.id],
  });
  if (res.rowsAffected === 0) throw new Error("ইনভয়েসটি পাওয়া যায়নি বা ইতিমধ্যে শূন্য।");
  const row = (await client.execute({ sql: "SELECT * FROM ad_invoices WHERE id = ?", args: [input.id] })).rows[0] as Record<string, unknown>;
  return (await withPaidTotals([row], client))[0] as AdInvoice;
}

/** Outstanding receivables per client — used by the payments page header. */
export async function invoiceBalance(clientId: string): Promise<{ issued: number; paid: number; open: number }> {
  const client = getClient();
  const invoices = await listInvoices(clientId);
  const active = invoices.filter((i) => i.status !== "void");
  const issued = active.reduce((sum, i) => sum + i.totalBdt, 0);
  const paid = active.reduce((sum, i) => sum + i.paidBdt, 0);
  return { issued, paid, open: issued - paid };
}
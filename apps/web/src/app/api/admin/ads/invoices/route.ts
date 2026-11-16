import { NextResponse } from "next/server";
import {
  issueInvoice,
  listAllInvoices,
  paymentsForInvoice,
  recordPayment,
  voidInvoice,
  type PaymentMethod,
} from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { limitRequest, LIMITS } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Manual invoice and payment capture.
 *
 * Admin only. Money is the one place where "close enough" is not close enough:
 * every write here is audited with the amount and the invoice number, and the
 * database refuses the three things that break a ledger — a payment larger than
 * what is outstanding, the same bank reference twice, and a payment against a
 * voided invoice.
 *
 * There is no gateway hook and no way for an advertiser to mark anything paid.
 */

const METHODS: PaymentMethod[] = ["bank_transfer", "bkash", "nagad", "cash", "cheque", "other"];

export async function GET(req: Request) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;

  const url = new URL(req.url);
  const invoiceId = url.searchParams.get("invoiceId");
  if (invoiceId) {
    return NextResponse.json(
      { ok: true, payments: await paymentsForInvoice(invoiceId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json({ ok: true, invoices: await listAllInvoices() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  const limited = await limitRequest(req, LIMITS.adminWrite);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const str = (key: string, limit = 200): string =>
    typeof body[key] === "string" ? (body[key] as string).trim().slice(0, limit) : "";
  const int = (key: string): number => {
    const value = Number(body[key]);
    return Number.isFinite(value) ? Math.trunc(value) : NaN;
  };

  try {
    if (action === "issue") {
      const clientId = str("clientId", 80);
      const subtotalBdt = int("subtotalBdt");
      const vatBdt = int("vatBdt");
      if (!clientId) return NextResponse.json({ ok: false, error: "clientId প্রয়োজন" }, { status: 400 });
      if (!Number.isInteger(subtotalBdt) || subtotalBdt <= 0) {
        return NextResponse.json({ ok: false, error: "subtotal ধনাত্মক সংখ্যা হতে হবে" }, { status: 400 });
      }
      const invoice = await issueInvoice({
        clientId,
        bookingId: str("bookingId", 80) || null,
        subtotalBdt,
        vatBdt: Number.isInteger(vatBdt) && vatBdt > 0 ? vatBdt : 0,
        dueAt: str("dueAt", 40) || null,
        notes: str("notes", 500) || null,
        createdBy: user.email,
      });
      await audit(
        user,
        {
          action: "ads.invoice.issue",
          entityType: "ad_invoice",
          entityId: invoice.id,
          summary: `ইনভয়েস ${invoice.invoiceNo} — ৳${invoice.totalBdt}`,
          metadata: { invoiceNo: invoice.invoiceNo, clientId, totalBdt: invoice.totalBdt, bookingId: invoice.bookingId },
        },
        req,
      );
      return NextResponse.json({ ok: true, invoice });
    }

    if (action === "payment") {
      const invoiceId = str("invoiceId", 80);
      const amountBdt = int("amountBdt");
      const method = str("method", 40) as PaymentMethod;
      if (!invoiceId) return NextResponse.json({ ok: false, error: "invoiceId প্রয়োজন" }, { status: 400 });
      if (!METHODS.includes(method)) {
        return NextResponse.json({ ok: false, error: `method হতে হবে: ${METHODS.join(", ")}` }, { status: 400 });
      }
      const invoice = await recordPayment({
        invoiceId,
        amountBdt,
        method,
        reference: str("reference", 120) || null,
        receivedAt: str("receivedAt", 40) || null,
        recordedBy: user.email,
      });
      await audit(
        user,
        {
          action: "ads.invoice.payment",
          entityType: "ad_invoice",
          entityId: invoice.id,
          summary: `৳${amountBdt} পেমেন্ট নথিভুক্ত — ${invoice.invoiceNo} (${method})`,
          metadata: { invoiceNo: invoice.invoiceNo, amountBdt, method, status: invoice.status, reference: str("reference", 120) || null },
        },
        req,
      );
      return NextResponse.json({ ok: true, invoice });
    }

    if (action === "void") {
      const id = str("invoiceId", 80);
      const reason = str("reason", 300);
      if (!id) return NextResponse.json({ ok: false, error: "invoiceId প্রয়োজন" }, { status: 400 });
      const invoice = await voidInvoice({ id, reason, by: user.email });
      await audit(
        user,
        {
          action: "ads.invoice.void",
          entityType: "ad_invoice",
          entityId: invoice.id,
          summary: `ইনভয়েস ${invoice.invoiceNo} শূন্য — ${reason}`,
          metadata: { invoiceNo: invoice.invoiceNo, reason },
        },
        req,
      );
      return NextResponse.json({ ok: true, invoice });
    }

    return NextResponse.json({ ok: false, error: "action হতে হবে: issue, payment, void" }, { status: 400 });
  } catch (error) {
    // The database messages are already written for an operator to read (they
    // name the outstanding amount, the duplicate reference, or the void state).
    const message = error instanceof Error ? error.message : "অজানা ত্রুটি";
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }
}

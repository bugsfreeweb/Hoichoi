import { NextResponse } from "next/server";
import { markNotificationsEmailed, pendingEmailNotifications } from "@hoichoi/db";
import { sendMail } from "@/lib/mail";
import { reportError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "জরুরি",
  warn: "সতর্কতা",
  info: "তথ্য",
};

/**
 * Alert mail digest.
 *
 * Fails closed without `CRON_SECRET`, exactly like the credential cron: an
 * unauthenticated endpoint that sends mail is a spam relay. GET is a dry run so a
 * workflow can be checked without mailing anyone.
 *
 * Only `warn`/`critical` rows that have never been emailed are sent, and each one
 * is stamped after a successful send — so a mailbox gets one message per event,
 * not one per run.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (given !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const pending = await pendingEmailNotifications(30);
  const to = process.env.SECURITY_CONTACT_EMAIL || process.env.ADMIN_ALERT_EMAIL || "";
  if (pending.length === 0) return NextResponse.json({ ok: true, sent: 0, pending: 0 });

  const lines = pending.map(
    (n) =>
      `• [${SEVERITY_LABEL[n.severity] ?? n.severity}] ${n.title_bn}` +
      (n.body_bn ? `\n  ${n.body_bn}` : "") +
      (n.href ? `\n  ${process.env.SITE_URL ?? ""}${n.href}` : ""),
  );
  const text =
    `হৈচৈ ডেস্কে ${pending.length}টি ঘটনা ঘটেছে:\n\n${lines.join("\n\n")}\n\n` +
    `— এই মেইলটি স্বয়ংক্রিয়; ড্যাশবোর্ডে বেল থেকে বিস্তারিত দেখা যাবে।`;

  if (!to) {
    return NextResponse.json(
      { ok: false, error: "no alert recipient configured (SECURITY_CONTACT_EMAIL)", pending: pending.length },
      { status: 502 },
    );
  }

  const result = await sendMail({
    to,
    subject: `হৈচৈ অ্যালার্ট · ${pending.length}টি ঘটনা`,
    text,
  });
  if (!result.ok) {
    // A digest that cannot be sent means nobody will be told about the events in
    // it, so this is worth an incident report rather than a quiet 502.
    void reportError(new Error(result.error ?? "alert digest failed"), {
      event: "cron.alerts.failed",
      route: "/api/cron/alerts",
      pending: pending.length,
    });
    return NextResponse.json({ ok: false, error: result.error, pending: pending.length }, { status: 502 });
  }

  await markNotificationsEmailed(pending.map((n) => n.id));
  return NextResponse.json({ ok: true, sent: pending.length, to });
}

/** Dry run: what would be mailed right now. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if ((req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const pending = await pendingEmailNotifications(30);
  return NextResponse.json({
    ok: true,
    dryRun: true,
    pending: pending.length,
    items: pending.map((n) => ({ severity: n.severity, title: n.title_bn })),
    to: process.env.SECURITY_CONTACT_EMAIL || process.env.ADMIN_ALERT_EMAIL || null,
  });
}

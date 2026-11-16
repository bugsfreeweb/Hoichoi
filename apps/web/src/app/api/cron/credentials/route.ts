import { NextRequest, NextResponse } from "next/server";
import { credentialsDue, credentialState, listCredentials, markNotified, notify } from "@hoichoi/db";
import { sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * Daily credential expiry check.
 *
 * Called by the scheduled workflow (`.github/workflows/credential-check.yml`) or
 * Vercel Cron with `Authorization: Bearer $CRON_SECRET`.
 *
 * Fails **closed**: without a configured secret it refuses to run (503), because
 * an open endpoint that sends mail on demand is a spam amplifier. The job is
 * idempotent per day — `last_notified_at` is stamped after a successful send, so
 * a retry or a manual curl does not produce a second identical email.
 */

const DAY_MS = 86_400_000;

function authorize(req: NextRequest): { ok: true } | { ok: false; res: NextResponse } {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: "cron is not configured (CRON_SECRET missing)" }, { status: 503 }),
    };
  }
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const query = req.nextUrl.searchParams.get("secret")?.trim() ?? "";
  if (bearer === secret || query === secret) return { ok: true };
  return { ok: false, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
}

export async function GET(req: NextRequest) {
  return run(req, false);
}

export async function POST(req: NextRequest) {
  return run(req, true);
}

async function run(req: NextRequest, send: boolean) {
  const auth = authorize(req);
  if (!auth.ok) return auth.res;

  const now = Date.now();
  const due = await credentialsDue(now);
  const all = await listCredentials();
  const summary = all.map((row) => ({ name: row.name, scope: row.scope, ...credentialState(row.expires_at, now, row.warn_days) }));

  // Mirror every due credential into the bell as well: mail can be filtered,
  // and the desk is where someone actually renews the key.
  for (const { row, status } of due) {
    await notify({
      kind: "credential",
      severity: status.state === "expired" ? "critical" : "warn",
      title_bn: `${row.name} — ${status.state === "expired" ? "মেয়াদ শেষ" : `${status.daysLeft} দিন বাকি`}`,
      body_bn: `${row.scope} ক্রেডেনশিয়াল · ${status.expiresAt?.slice(0, 10) ?? row.expires_at.slice(0, 10)}`,
      href: "/admin/security",
      dedupeKey: `credential:${row.name}:${status.state}:${status.expiresAt?.slice(0, 10) ?? row.expires_at.slice(0, 10)}`,
    }).catch(() => undefined);
  }

  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, due: 0, checked: all.length, credentials: summary });
  }

  const lines = due.map(({ row, status }) => {
    const when = status.state === "expired" ? "মেয়াদ শেষ" : `${status.daysLeft} দিন বাকি`;
    return `• ${row.name} (${row.scope}) — ${when} — ${status.expiresAt?.slice(0, 10) ?? row.expires_at.slice(0, 10)}`;
  });

  const recipients = Array.from(
    new Set(
      due
        .map(({ row }) => row.owner_email)
        .filter((email): email is string => Boolean(email)),
    ),
  );
  const fallback =
    process.env.SECURITY_CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_ALLOWED_EMAILS?.split(",")[0]?.trim() ||
    "";
  const to = recipients.length > 0 ? recipients.join(",") : fallback;

  if (!send) {
    // Dry run: report who *would* be mailed, without sending or stamping.
    return NextResponse.json({ ok: true, dryRun: true, due: due.length, to, credentials: summary });
  }

  if (!to) {
    return NextResponse.json(
      { ok: false, due: due.length, error: "কোনও প্রাপকের ইমেইল নেই (SECURITY_CONTACT_EMAIL)।" },
      { status: 400 },
    );
  }

  const result = await sendMail({
    to,
    subject: `[হইচই] ${due.length}টি ক্রেডেনশিয়ালের মেয়াদ শেষ হচ্ছে`,
    text: [
      "নিচের ক্রেডেনশিয়ালগুলোর মেয়াদ শেষ হচ্ছে বা শেষ হয়ে গেছে:",
      "",
      ...lines,
      "",
      "নবায়ন করে অ্যাডমিন কনসোল → নিরাপত্তা → ক্রেডেনশিয়াল-এ নতুন তারিখ দিন।",
      "",
      `(checked ${all.length}, due ${due.length}, ${new Date(now).toISOString()})`,
    ].join("\n"),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, due: due.length, error: result.error ?? "ইমেইল পাঠানো যায়নি।" }, { status: 502 });
  }

  await markNotified(
    due.map(({ row }) => row.id),
    now,
  );

  return NextResponse.json({ ok: true, sent: due.length, transport: result.transport, nextCheckAfterMs: DAY_MS, credentials: summary });
}

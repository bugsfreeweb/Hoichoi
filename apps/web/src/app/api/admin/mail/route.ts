import { NextResponse } from "next/server";
import { getClient } from "@hoichoi/db";
import { forbidden, requireApiUser, unauthorized } from "@/lib/auth";
import { mailConfig, messageShell, sendMail } from "@/lib/mail";
import { requestPasswordReset } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/mail — mail transport status + recent reset activity.
 *
 * POST /api/admin/mail
 *   { action: "test", to }                     → send a test message
 *   { action: "reset", kind, email }           → issue a reset link
 *
 * The reset action returns `devLink` when no transport is configured, so an
 * operator on a fresh install can still recover an account without shell access.
 * Only the admin console can read that link.
 */
export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const cfg = mailConfig();
  const recent = await getClient()
    .execute({
      sql: "SELECT kind, email, created_at, used_at, expires_at FROM password_resets ORDER BY created_at DESC LIMIT 8",
      args: [],
    })
    .catch(() => ({ rows: [] as unknown[] }));

  return NextResponse.json({
    ok: true,
    mail: { configured: cfg.configured, transport: cfg.transport, from: cfg.from, reason: cfg.reason ?? null },
    recent: (recent.rows as Record<string, unknown>[]).map((r) => ({
      kind: String(r.kind),
      email: String(r.email),
      createdAt: String(r.created_at),
      used: Boolean(r.used_at),
      expiresAt: String(r.expires_at),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as
    | { action?: string; to?: string; kind?: "admin" | "advertiser"; email?: string }
    | null;
  if (!body?.action) return NextResponse.json({ error: "action required" }, { status: 400 });

  if (body.action === "test") {
    const to = (body.to ?? user.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "সঠিক ইমেইল ঠিকানা দিন।" }, { status: 400 });
    }
    const { text, html } = messageShell(
      "মেইল কনফিগারেশন পরীক্ষা",
      "এই বার্তাটি হৈচৈ অ্যাডমিন কনসোল থেকে পাঠানো হয়েছে। আপনি এটি পেয়েছেন মানে SMTP/Resend কনফিগারেশন কাজ করছে।",
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://hoichoifeed.vercel.app",
      "সাইট খুলুন",
    );
    const result = await sendMail({ to, subject: "হৈচৈ · মেইল টেস্ট", text, html });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "ইমেইল পাঠানো যায়নি।" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, transport: result.transport, to });
  }

  if (body.action === "reset") {
    const kind = body.kind === "admin" ? "admin" : "advertiser";
    const email = (body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "সঠিক ইমেইল ঠিকানা দিন।" }, { status: 400 });
    }
    if (kind === "admin") {
      // Admins sign in with codes; a password reset link would be unusable.
      return NextResponse.json(
        { error: "অ্যাডমিন লগইন কোড দিয়ে হয় — Settings → Admin access অথবা /admin/forgot ব্যবহার করুন।" },
        { status: 400 },
      );
    }
    const result = await requestPasswordReset(kind, email, { exposeLink: true });
    if (!result.found) return NextResponse.json({ error: "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      transport: result.transport,
      devLink: result.devLink ?? null,
      error: result.error ?? null,
    });
  }

  return NextResponse.json({ error: `unknown action: ${body.action}` }, { status: 400 });
}

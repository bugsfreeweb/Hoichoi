import { NextResponse } from "next/server";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  mfaState,
} from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { limitRequest, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Second-factor management for the signed-in account.
 *
 * Only ever acts on **the caller's own** email — there is no `email` parameter,
 * so this endpoint cannot enroll, disable or inspect somebody else's factor. An
 * admin who wants to reset another account's MFA does it through the database,
 * deliberately, not through a convenience route.
 *
 * The secret is returned exactly once, at `begin`, because that is the moment
 * the operator has to type it into an authenticator app. `GET` never returns it
 * and never returns recovery codes.
 */
export async function GET() {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const state = await mfaState(guard.user.email);
  return NextResponse.json({
    ok: true,
    enabled: state?.enabled ?? false,
    confirmedAt: state?.confirmedAt ?? null,
    recoveryCodesRemaining: state?.recoveryCodesRemaining ?? 0,
  });
}

export async function POST(req: Request) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  const limited = await limitRequest(req, LIMITS.adminWrite);
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as { action?: string; code?: string } | null;
  if (!body?.action) return NextResponse.json({ ok: false, error: "action required" }, { status: 400 });

  try {
    if (body.action === "begin") {
      const begun = await beginMfaEnrollment(user.email);
      await audit(
        user,
        { action: "mfa.begin", entityType: "admin_users", summary: "দুই-ধাপ যাচাইয়ের সেটআপ শুরু" },
        req,
      );
      // The secret is shown once, here, and never read back.
      return NextResponse.json({ ok: true, secret: begun.secret, uri: begun.uri });
    }

    if (body.action === "confirm") {
      if (!body.code) return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
      const { recoveryCodes } = await confirmMfaEnrollment(user.email, body.code);
      await audit(
        user,
        { action: "mfa.enable", entityType: "admin_users", summary: "দুই-ধাপ যাচাই চালু হয়েছে" },
        req,
      );
      // Recovery codes are shown exactly once.
      return NextResponse.json({ ok: true, recoveryCodes });
    }

    if (body.action === "disable") {
      if (!body.code) return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
      await disableMfa(user.email, body.code);
      await audit(
        user,
        { action: "mfa.disable", entityType: "admin_users", summary: "দুই-ধাপ যাচাই বন্ধ করা হয়েছে" },
        req,
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `unknown action: ${body.action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
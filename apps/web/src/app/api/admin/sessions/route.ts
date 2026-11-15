import { NextRequest, NextResponse } from "next/server";
import {
  listAdminSessions,
  revokeAdminSessionById,
  revokeAllAdminSessions,
} from "@hoichoi/db";
import { currentSession, forbidden, requireApiUser, unauthorized, requiresRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sessions
 *   ?scope=all  — every admin's sessions (admin role only)
 *   default     — the caller's own sessions/devices
 *
 * POST /api/admin/sessions
 *   { action: "revoke", id }            — cut off one device
 *   { action: "revoke_all", keepSelf? } — sign out everywhere
 *
 * An admin may always revoke their own sessions. Revoking *another* admin's
 * session requires the `admin` role, otherwise a moderator could evict the
 * operator mid-incident.
 */
export async function GET(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "all") {
    if (!requiresRole(user, "admin")) return forbidden();
    const rows = await listAdminSessions({ limit: 200 });
    const current = await currentSession();
    return NextResponse.json({
      scope: "all",
      currentId: current?.id ?? null,
      sessions: rows.map((r) => ({ ...r, current: r.id === current?.id })),
    });
  }
  const rows = await listAdminSessions({ email: user.email, limit: 100 });
  const current = await currentSession();
  return NextResponse.json({
    scope: "self",
    currentId: current?.id ?? null,
    sessions: rows.map((r) => ({ ...r, current: r.id === current?.id })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => null)) as
    | { action?: string; id?: string; keepSelf?: boolean }
    | null;
  const action = body?.action;
  if (action !== "revoke" && action !== "revoke_all") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const current = await currentSession();
  const reason = action === "revoke_all" ? "revoke_all" : "revoked_by_admin";

  if (action === "revoke_all") {
    const revoked = await revokeAllAdminSessions(
      user.user_id,
      user.email,
      reason,
      body?.keepSelf ? (current?.id ?? null) : null,
    );
    return NextResponse.json({ ok: true, revoked, keptCurrent: Boolean(body?.keepSelf) });
  }

  const id = String(body?.id ?? "").trim();
  // Public session ids are the first 16 hex chars of the token hash.
  if (!/^[0-9a-f]{16}$/i.test(id)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  // Object-level authorization: the session must belong to the caller, unless
  // the caller is an admin.
  if (!requiresRole(user, "admin")) {
    const own = await listAdminSessions({ email: user.email, limit: 200 });
    if (!own.some((s) => s.id === id)) return forbidden();
  }

  const revoked = await revokeAdminSessionById(id, user.email, reason);
  if (revoked === 0) {
    return NextResponse.json({ error: "session not found or already revoked" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, revoked });
}

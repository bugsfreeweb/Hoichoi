import { NextResponse } from "next/server";
import { eraseGuestData, exportGuestData } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { limitRequest, LIMITS } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Data-subject requests (GDPR-style export and erasure).
 *
 * Admin only, audited, and deliberately blind: the caller supplies a guest id or
 * an email; the lookup hashes the email itself. Nothing here is a listing
 * endpoint — there is no way to page through other people's rows.
 *
 * Erasure is a hard delete of that guest's public-form rows and nothing else:
 * published posts, comments other people wrote, and audit rows stay. An erasure
 * that also rewrote editorial history would be a different, worse product.
 */
export async function POST(req: Request) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const admin = guard.user;
  if (admin.role !== "admin") return forbidden();

  const limited = await limitRequest(req, LIMITS.adminWrite);
  if (limited) return limited;

  let body: { action?: unknown; guestId?: unknown; email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const action = body.action === "erase" ? "erase" : body.action === "export" ? "export" : null;
  if (!action) {
    return NextResponse.json({ ok: false, error: "action must be export or erase" }, { status: 400 });
  }
  const guestId = typeof body.guestId === "string" ? body.guestId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!guestId && !email) {
    return NextResponse.json({ ok: false, error: "guestId or email required" }, { status: 400 });
  }
  if (guestId && !/^[A-Za-z0-9_-]{16,80}$/.test(guestId)) {
    return NextResponse.json({ ok: false, error: "invalid guestId" }, { status: 400 });
  }

  try {
    if (action === "export") {
      const data = await exportGuestData({ guestId: guestId || undefined, email: email || undefined });
      const total =
        data.comments.length + data.reports.length + data.submissions.length + data.removals.length;
      await audit(admin, {
        action: "privacy.export",
        entityType: "guest",
        entityId: guestId ? `${guestId.slice(0, 8)}…` : null,
        summary: `ডেটা এক্সপোর্ট — ${total}টি সারি (ইমেইল হ্যাশ দিয়ে খোঁজা হলে সনাক্তকরণ লেখা হয়নি)`,
        metadata: { total },
      }, req);
      return NextResponse.json({ ok: true, action, total, data });
    }

    const counts = await eraseGuestData({ guestId: guestId || undefined, email: email || undefined });
    const total = counts.comments + counts.reports + counts.submissions + counts.removals;
    await audit(admin, {
      action: "privacy.erase",
      entityType: "guest",
      entityId: guestId ? `${guestId.slice(0, 8)}…` : null,
      summary: `ডেটা মুছে ফেলা — ${total}টি সারি (মন্তব্য ${counts.comments}, রিপোর্ট ${counts.reports}, সাবমিশন ${counts.submissions}, সরানোর অনুরোধ ${counts.removals})`,
      metadata: counts,
    }, req);
    return NextResponse.json({ ok: true, action, erased: counts, total });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "privacy action failed" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { reconcileMedia, retryMediaDeletions } from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { limitRequest, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Media orphan reconciliation.
 *
 * GET is a **dry run** — it scans and reports, changing nothing, so an operator
 * can read the numbers before anything is deleted. POST performs the cleanup and
 * is admin-only and audited.
 *
 * Only provably unreferenced files are removed: anything a post still points at
 * is untouched, and local files younger than the 6-hour guard are left alone
 * because an upload may still be in flight.
 */
export async function GET() {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  try {
    const report = await reconcileMedia({ dryRun: true });
    return NextResponse.json({ ok: true, dryRun: true, report });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || "reconciliation failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  const limited = await limitRequest(req, LIMITS.submission);
  if (limited) return limited;

  try {
    // Retry whatever a previous post-delete could not remove (a locked file on
    // Windows is the common case). This runs with the reconcile pass because
    // both jobs answer the same question: "is anything left behind?".
    const retried = await retryMediaDeletions(50).catch(() => ({ retried: 0, deleted: 0 }));
    const report = await reconcileMedia({ dryRun: false });
    await audit(
      user,
      {
        action: "media.reconcile",
        entityType: "media",
        summary: `মিডিয়া পুনর্মিলন · ${report.deletedLocal.length} লোকাল ফাইল ও ${report.deletedRemoteRows} রেকর্ড মুছে`,
        metadata: { byClass: report.byClass, deletedLocal: report.deletedLocal.length },
      },
      req,
    ).catch(() => undefined);
    return NextResponse.json({ ok: true, dryRun: false, report, retried });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || "reconciliation failed" },
      { status: 500 },
    );
  }
}

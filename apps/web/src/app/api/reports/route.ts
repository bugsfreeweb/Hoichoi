import { NextRequest, NextResponse } from "next/server";
import {
  createReaderReport,
  listReaderReports,
  setReaderReportStatus,
  getPostById,
} from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/report-reasons";

export const dynamic = "force-dynamic";

function bad(msg = "Bad request"): NextResponse {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

const REASON_VALUES: readonly string[] = REPORT_REASONS;

/**
 * POST /api/reports  { postId, reporterName, reporterEmail, reason, details }
 * Public — a new report lands in the queue (status = open). Validates the
 * same REPORT_REASONS list the form renders.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return bad();
  }
  const { postId, reporterName, reporterEmail, reason, details } = (payload ?? {}) as {
    postId?: unknown;
    reporterName?: unknown;
    reporterEmail?: unknown;
    reason?: unknown;
    details?: unknown;
  };
  const ref = typeof postId === "string" ? postId.trim() : "";
  const name = typeof reporterName === "string" ? reporterName.trim() : "";
  const email = typeof reporterEmail === "string" ? reporterEmail.trim() : "";
  const reasonStr = typeof reason === "string" ? reason.trim() : "";
  const detailsStr = typeof details === "string" ? details.trim() : "";

  if (!ref || name.length < 2 || name.length > 60) return bad("নাম খুব ছোট বা খুব দীর্ঘ");
  if (!REASON_VALUES.includes(reasonStr)) return bad("অজানা রিপোর্টের কারণ");
  if (detailsStr.length > 500) return bad("বিস্তারিত সর্বোচ্চ ৫০০ অক্ষর");
  if (email.length > 120) return bad("ইমেইল খুব দীর্ঘ");

  const post = await getPostById(ref);
  if (!post) {
    return NextResponse.json({ ok: false, error: "প্রতিবেদন পাওয়া যায়নি" }, { status: 404 });
  }

  try {
    const report = await createReaderReport({
      postId: post.id,
      reporterName: name,
      reporterEmail: email || undefined,
      reason: reasonStr,
      details: detailsStr || undefined,
    });
    return NextResponse.json(
      { ok: true, report, message: "রিপোর্ট জমা হয়েছে — সম্পাদকীয় দল পর্যালোচনা করবে।" },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Insert failed" },
      { status: 500 },
    );
  }
}

/** GET /api/reports — admin queue. */
export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const reports = await listReaderReports();
  return NextResponse.json({ ok: true, reports });
}

/** PATCH /api/reports  { id, action: "reviewed" | "dismissed" } — admin. */
export async function PATCH(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role === "moderator") return forbidden();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return bad();
  }
  const { id, action } = (payload ?? {}) as { id?: unknown; action?: unknown };
  const nid = typeof id === "string" ? id.trim() : "";
  const status = action === "reviewed" ? "reviewed" : action === "dismissed" ? "dismissed" : null;
  if (!nid || !status) return bad();

  try {
    await setReaderReportStatus(nid, status);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: nid, status });
}
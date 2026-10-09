import { NextResponse } from "next/server";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";
import { countReviewQueues } from "@hoichoi/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notifications — queue depths for the shell's live badge.
 *
 * The header bell used to render nothing, and the sidebar badges were written as
 * static "?" placeholders, so the one signal an operator had that work had
 * arrived was opening each queue page. This returns the counts that badge needs
 * and nothing else, so the bell can poll cheaply instead of the operator
 * guessing.
 *
 * Counts only — no row bodies, no titles, no reader-supplied text. The bell
 * needs to know *that* something is waiting and where, not what it says.
 */
export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  try {
    const counts = await countReviewQueues();
    return NextResponse.json({
      ok: true,
      counts,
      // The bell sorts by urgency, so the API states the order rather than
      // leaving each client to re-derive it (and getting it wrong).
      urgent: [
        {
          key: "open_removals" as const,
          href: "/admin/removals",
          count: counts.open_removals,
          label: "সরানোর অনুরোধ",
        },
        {
          key: "open_reports" as const,
          href: "/admin/reports",
          count: counts.open_reports,
          label: "পাঠকের রিপোর্ট",
        },
        {
          key: "new_submissions" as const,
          href: "/admin/submissions",
          count: counts.new_submissions,
          label: "নতুন সাবমিশন",
        },
        {
          key: "pending_review" as const,
          href: "/admin/moderation",
          count: counts.pending_review,
          label: "কনটেন্ট মডারেশন",
        },
        {
          key: "approved" as const,
          href: "/admin/moderation?approvedPage=1",
          count: counts.approved,
          label: "দ্বিতীয় অনুমোদন",
        },
        {
          key: "pending_comments" as const,
          href: "/admin/comments",
          count: counts.pending_comments,
          label: "অপেক্ষমান মন্তব্য",
        },
      ],
      at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "নোটিফিকেশন গণনা ব্যর্থ।",
      },
      { status: 500 },
    );
  }
}

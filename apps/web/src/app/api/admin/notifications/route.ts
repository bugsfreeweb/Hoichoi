import { NextResponse } from "next/server";
import { forbidden, requireApiRole } from "@/lib/auth";
import {
  countReviewQueues,
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@hoichoi/db";

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
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  try {
    const [counts, alerts, unread] = await Promise.all([
      countReviewQueues(),
      // Real events (a provider cooling down, a credential expiring, a cron that
      // failed closed). Queue depths cannot express these, and they were the
      // things an operator only found out about by reading a log.
      listNotifications({ limit: 8, roleMin: user.role }).catch(() => []),
      countUnreadNotifications(user.role).catch(() => 0),
    ]);
    return NextResponse.json({
      ok: true,
      counts,
      alerts,
      unread,
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

/**
 * Mark alerts read. `{ id }` marks one; `{ all: true }` marks every alert the
 * caller can see. Queue counts are derived, so they need no read state.
 */
export async function POST(req: Request) {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  let body: { id?: unknown; all?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  if (body.all === true) {
    const marked = await markAllNotificationsRead(user.role);
    return NextResponse.json({ ok: true, marked });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!/^[0-9a-f]{18,32}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }
  const marked = await markNotificationRead(id, user.role);
  return NextResponse.json({ ok: true, marked });
}

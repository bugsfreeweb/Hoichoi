import { NextRequest, NextResponse } from "next/server";
import { ArchiveDeleteRefused, deleteArchivedPost, deletePostsOlderThan, getSettings, nowIso } from "@hoichoi/db";
import { getClient } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * Delete archived content — one post, or everything past the age line.
 *
 * Two shapes, one endpoint, because they are the same decision:
 *
 *   { id }               → permanently delete that archived post
 *   { olderThanDays: n } → permanently delete every post older than n days
 *
 * The single-post form only works on archived content (deleting live content goes
 * through the post editor, a different audited path) and refuses a legal hold.
 * The age form applies the same two guards to every row it matches and reports
 * what it skipped, so an operator never believes a held case was swept away.
 *
 * The deletion itself lives in `@hoichoi/db` (`deleteArchivedPost`,
 * `deletePostsOlderThan`) so the desk screen and this route cannot drift: a
 * desktop delete that forgot the legal hold would be a legal incident, not a bug.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as
    | { id?: string; olderThanDays?: number }
    | null;

  if (typeof body?.olderThanDays === "number") {
    const days = Math.floor(body.olderThanDays);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return NextResponse.json({ error: "olderThanDays must be 1–3650" }, { status: 400 });
    }
    const report = await deletePostsOlderThan(days, user.email);
    await audit(
      user,
      {
        action: "archive.purge_age",
        entityType: "system",
        summary: `${days} দিনের বেশি পুরনো ${report.deleted}টি পোস্ট মুছে ফেলা হয়েছে`,
        metadata: {
          days,
          deleted: report.deleted,
          skippedLegalHold: report.skippedLegalHold,
          skippedActiveCase: report.skippedActiveCase,
        },
      },
      req,
    );
    return NextResponse.json({ ok: true, ...report });
  }

  const id = body?.id?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "id অথবা olderThanDays দিন" },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteArchivedPost(id, user.email);
    await getClient().execute({
      sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'posts', ?, ?)",
      args: [crypto.randomUUID(), user.user_id, "archive.permanent_delete", id, nowIso()],
    });
    return NextResponse.json({ ok: true, deleted: 1, title: deleted.title_bn });
  } catch (err) {
    if (err instanceof ArchiveDeleteRefused) {
      const messages: Record<string, string> = {
        not_found: "পোস্টটি পাওয়া যায়নি।",
        not_archived:
          "এই পোস্টটি আর্কাইভড নয় — স্থায়ীভাবে মুছতে পারি না। আগে আর্কাইভ করুন।",
        legal_hold: "এই পোস্টে legal hold আছে — আইনি বাধা থাকা আর্কাইভ মুছে ফেলা যাবে না।",
      };
      const status = err.reason === "not_found" ? 404 : 409;
      return NextResponse.json(
        { error: messages[err.reason], reason: err.reason },
        { status },
      );
    }
    throw err;
  }
}

/**
 * The archive list as JSON.
 *
 * The web page renders straight from the database, but the desk screen talks to
 * this endpoint through the same session it uses for every other console call —
 * one list, one shape, two surfaces.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const { listArchivedPostsPage, listExpiredPosts, countExpiredPosts, getSettings: settingsOf } =
    await import("@hoichoi/db");
  const settings = await settingsOf();
  const retention = Number(url.searchParams.get("olderThan") ?? settings.archive_retention_days ?? 30);
  const [archived, expiredCount, expired] = await Promise.all([
    listArchivedPostsPage(page, 50),
    countExpiredPosts(retention),
    listExpiredPosts(retention, 50),
  ]);
  return NextResponse.json({
    ok: true,
    rows: archived.rows.map((p) => ({
      id: p.id,
      title_bn: p.title_bn,
      slug: p.slug,
      category: p.category,
      published_at: p.published_at,
      archived_at: p.archived_at,
      archive_reason: p.archive_reason,
      legal_hold: p.legal_hold,
    })),
    total: archived.total,
    page: archived.page,
    visibleDays: settings.archive_visible_days,
    retentionDays: retention,
    expiredCount,
    expired,
  });
}

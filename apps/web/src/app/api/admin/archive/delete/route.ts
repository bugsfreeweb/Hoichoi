import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso } from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

/**
 * Permanently delete a single archived post.
 *
 * The retention purge only removes rows past the retention window, so an
 * operator had no way to clear one specific archived post early — for instance
 * a duplicate that survived rollover, or content pulled after a legal concern.
 *
 * Two guards apply:
 *   - the post must actually be archived (deleting live content goes through
 *     the normal post editor, which is a different, audited path)
 *   - a legal hold blocks deletion, matching `purgeExpired`
 *
 * The row is removed rather than soft-deleted, so `raw_posts` keeps the
 * original text and the source can be re-scraped if it is ever needed again.
 */
export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const client = getClient();
  const found = await client.execute({
    sql: "SELECT id, title_bn, archived_at, legal_hold FROM posts WHERE id = ?",
    args: [id],
  });
  const row = found.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }
  if (!row.archived_at) {
    return NextResponse.json(
      {
        error:
          "এই পোস্টটি আর্কাইভড নয় — স্থায়ীভাবে মুছতে পারি না। আগে আর্কাইভ করুন।",
        archived: false,
      },
      { status: 409 },
    );
  }
  if (Number(row.legal_hold ?? 0) === 1) {
    return NextResponse.json(
      {
        error:
          "এই পোস্টে legal hold আছে — আইনি বাধা থাকা আর্কাইভ মুছে ফেলা যাবে না।",
        legalHold: true,
      },
      { status: 409 },
    );
  }

  await client.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [id] });
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'posts', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "archive.permanent_delete", id, nowIso()],
  });

  return NextResponse.json({ ok: true, deleted: 1, title: String(row.title_bn ?? "") });
}

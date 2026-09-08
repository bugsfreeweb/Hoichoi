import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso } from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

/** ঊজ্জ্বল পদক্ষেপ: removal_request-র উপর মডারেশন। */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    status?: "reviewed" | "actioned";
    actionOnPost?: "none" | "remove" | "archive";
    note?: string;
  } | null;

  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM removal_requests WHERE id = ?", args: [id] });
  if (res.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const row = res.rows[0] as Record<string, unknown>;

  const status = (body?.status ?? "reviewed") as "reviewed" | "actioned";
  await client.execute({
    sql: "UPDATE removal_requests SET status = ? WHERE id = ?",
    args: [status, id],
  });

  const postId = (row.post_id as string | null) ?? null;
  if ((body?.actionOnPost === "remove" || body?.actionOnPost === "archive") && postId) {
    if (body.actionOnPost === "remove") {
      await client.execute({
        sql: "UPDATE posts SET status = 'removed', updated_at = ? WHERE id = ?",
        args: [nowIso(), postId],
      });
    } else {
      await client.execute({
        sql: "UPDATE posts SET archived_at = ?, archive_reason = 'manual', updated_at = ? WHERE id = ?",
        args: [nowIso(), nowIso(), postId],
      });
    }
  }

  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, 'removal_requests', ?, ?, ?)",
    args: [
      crypto.randomUUID(),
      user.user_id,
      `removal.${status}${body?.actionOnPost && body.actionOnPost !== "none" ? `.${body.actionOnPost}` : ""}`,
      id,
      body?.note ? JSON.stringify({ note: body.note }) : null,
      nowIso(),
    ],
  });
  return NextResponse.json({ ok: true });
}
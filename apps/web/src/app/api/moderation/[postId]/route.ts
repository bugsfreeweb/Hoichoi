import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso, getPostById, getCategory } from "@hoichoi/db";
import { requireApiUser, unauthorized } from "@/lib/auth";

type Action = "approve" | "publish" | "reject" | "remove" | "archive";

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();

  const { postId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { action?: Action; note?: string } | null;
  const action = body?.action;
  if (!["approve", "publish", "reject", "remove", "archive"].includes(action ?? "")) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  // moderators may approve (pending_review→approved) or reject; publish/remove/archive needs editor/admin
  if (user.role === "moderator" && action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "forbidden for moderator role" }, { status: 403 });
  }

  const post = await getPostById(postId);
  if (!post) return NextResponse.json({ error: "post not found" }, { status: 404 });

  const client = getClient();
  const actorId = user.user_id;
  const cat = await getCategory(post.category);
  const double = Boolean(cat?.config.requires_double_approval);
  const note = body?.note?.trim() || null;

  async function log(actionName: string, details: Record<string, unknown> | null) {
    await client.execute({
      sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, 'posts', ?, ?, ?)",
      args: [crypto.randomUUID(), actorId, actionName, postId, details ? JSON.stringify(details) : null, nowIso()],
    });
  }

  let response: { ok: true; status: string; needsSecond?: boolean } = { ok: true, status: post.status };
  let newStatus: string | null = null;

  switch (action) {
    case "approve": {
      if (double) {
        const prior = await client.execute({
          sql: "SELECT count(*) AS n FROM admin_actions WHERE target_table = 'posts' AND target_id = ? AND action = 'moderation.approve'",
          args: [postId],
        });
        const approvedCount = Number(prior.rows[0]?.n ?? 0);
        if (approvedCount === 0 && post.status === "pending_review") {
          newStatus = "approved"; // 1st approver — queue for 2nd
          response = { ok: true, status: "approved", needsSecond: true };
        } else {
          newStatus = "published";
          response = { ok: true, status: "published" };
        }
      } else {
        newStatus = "published";
        response = { ok: true, status: "published" };
      }
      break;
    }
    case "publish":
      newStatus = "published";
      response = { ok: true, status: "published" };
      break;
    case "reject":
      newStatus = "rejected";
      response = { ok: true, status: "rejected" };
      break;
    case "remove":
      newStatus = "removed";
      response = { ok: true, status: "removed" };
      break;
    case "archive":
      await client.execute({
        sql: "UPDATE posts SET archived_at = ?, archive_reason = 'manual', updated_at = ? WHERE id = ?",
        args: [nowIso(), nowIso(), postId],
      });
      await log("moderation.archive", note ? { note } : null);
      return NextResponse.json({ ok: true, status: post.status, archived: true });
  }

  if (newStatus) {
    const publishedAt =
      newStatus === "published" && !post.published_at ? nowIso() : post.published_at;
    await client.execute({
      sql: "UPDATE posts SET status = ?, published_at = COALESCE(?, published_at), updated_at = ? WHERE id = ?",
      args: [newStatus, publishedAt, nowIso(), postId],
    });
    await log(`moderation.${action}`, note ? { note, double } : { double });
  }

  return NextResponse.json(response);
}
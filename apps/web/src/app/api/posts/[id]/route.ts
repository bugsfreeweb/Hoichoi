import { NextRequest, NextResponse } from "next/server";
import {
  getPostById,
  updatePost,
  updatePostStatus,
  deletePost,
  getClient,
  nowIso,
  type PostUpdateFields,
} from "@hoichoi/db";
import type { PostStatus } from "@hoichoi/shared-types";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  const client = getClient();
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "post not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const fields: PostUpdateFields = {};
  const applied: string[] = [];

  const contentKeys = [
    "title_bn",
    "body_bn",
    "summary_bn",
    "category",
    "case_status",
    "published_at",
    "media_path",
  ] as const;
  for (const key of contentKeys) {
    if (!(key in body)) continue;
    const v = body[key];
    if (key === "summary_bn" || key === "published_at" || key === "media_path") {
      if (v === null || typeof v === "string") {
        (fields as Record<string, unknown>)[key] = v;
        applied.push(key);
      } else {
        return NextResponse.json({ error: `invalid ${key}` }, { status: 400 });
      }
    } else if (key === "case_status") {
      if (v === null || typeof v === "string") {
        (fields as Record<string, unknown>)[key] = v;
        applied.push(key);
      } else {
        return NextResponse.json({ error: "invalid case_status" }, { status: 400 });
      }
    } else if (typeof v === "string") {
      (fields as Record<string, unknown>)[key] = v;
      applied.push(key);
    } else {
      return NextResponse.json({ error: `invalid ${key}` }, { status: 400 });
    }
  }

  try {
    if (applied.length > 0) await updatePost(id, fields);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  let statusApplied: PostStatus | null = null;
  if (typeof body.status === "string") {
    const status = body.status as PostStatus;
    await updatePostStatus(id, status, { publishedAt: status === "published" });
    statusApplied = status;
  }

  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, 'posts', ?, ?, ?)",
    args: [
      crypto.randomUUID(),
      user.user_id,
      "post.update",
      id,
      JSON.stringify({ fields: applied, status: statusApplied, by: user.email }),
      nowIso(),
    ],
  });

  return NextResponse.json({ ok: true, applied, status: statusApplied });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await ctx.params;
  const client = getClient();
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "post not found" }, { status: 404 });

  await deletePost(id);
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, 'posts', ?, ?, ?)",
    args: [
      crypto.randomUUID(),
      user.user_id,
      "post.delete",
      id,
      JSON.stringify({ title_bn: post.title_bn, by: user.email }),
      nowIso(),
    ],
  });
  return NextResponse.json({ ok: true });
}
import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso } from "@hoichoi/db";
import type { InValue } from "@libsql/client";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const client = getClient();
  if (body) {
    const sets: string[] = [];
    const args: InValue[] = [];
    if (typeof body.is_active === "boolean") {
      sets.push("is_active = ?");
      args.push(body.is_active ? 1 : 0);
    }
    if (typeof body.is_verified === "boolean") {
      sets.push("is_verified = ?");
      args.push(body.is_verified ? 1 : 0);
    }
    if (typeof body.category === "string") {
      sets.push("category = ?");
      args.push(body.category);
    }
    if (typeof body.page_name === "string") {
      sets.push("page_name = ?");
      args.push(body.page_name);
    }
    if (sets.length > 0) {
      args.push(id);
      await client.execute({
        sql: `UPDATE sources SET ${sets.join(", ")} WHERE id = ?`,
        args,
      });
    }
  }
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'sources', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "source.update", id, nowIso()],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await ctx.params;
  const client = getClient();
  await client.execute({ sql: "DELETE FROM sources WHERE id = ?", args: [id] });
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'sources', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "source.delete", id, nowIso()],
  });
  return NextResponse.json({ ok: true });
}
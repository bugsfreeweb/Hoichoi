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
    // An empty array used to mean "remove every category", which is a footgun:
    // a client that always sends the array (even empty, e.g. before categories
    // load) silently wiped a source's whole membership. An explicit
    // `allCategories: true` is now required for that.
    if (body.allCategories === true || (Array.isArray(body.categories) && body.categories.length > 0)) {
      const { listCategories } = await import("@hoichoi/db");
      // Validate against every configured category, not only the active ones,
      // so saving never deletes a membership just because a category is off.
      const known = new Set((await listCategories({ includeInactive: true })).map((c) => c.slug));
      const requested = (body.allCategories === true
        ? [...known]
        : (body.categories as string[])
      ).map(String);
      const next = requested.filter((c) => known.has(c));
      await client.execute({ sql: "DELETE FROM source_categories WHERE source_id = ?", args: [id] });
      const primary = next[0];
      if (primary !== undefined) {
        const values = next.map(() => "(?, ?)").join(", ");
        const args2 = next.flatMap((slug: string) => [id, slug]);
        await client.execute({ sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`, args: args2 });
        // Keep the legacy primary in step with the membership it now describes.
        await client.execute({ sql: "UPDATE sources SET category = ? WHERE id = ?", args: [primary, id] });
      }
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
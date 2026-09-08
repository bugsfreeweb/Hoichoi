import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso } from "@hoichoi/db";
import type { CategorySlug } from "@hoichoi/shared-types";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

/** সাবমিশন রিভিউ: accept → sources-এ যোগ; reject → mark. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { decision?: "accept" | "reject"; category?: CategorySlug } | null;
  const decision = body?.decision;
  if (decision !== "accept" && decision !== "reject") {
    return NextResponse.json({ error: "decision=accept|reject required" }, { status: 400 });
  }

  const client = getClient();
  const sub = await client.execute({ sql: "SELECT * FROM submitted_pages WHERE id = ?", args: [id] });
  if (sub.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const row = sub.rows[0] as Record<string, unknown>;
  const category = (body?.category ?? row.category ?? "missing-children") as CategorySlug;
  const valid: CategorySlug[] = ["child-sexual-abuse", "extramarital-crime", "missing-children"];

  await client.execute({
    sql: "UPDATE submitted_pages SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
    args: [decision === "accept" ? "accepted" : "rejected", user.user_id, nowIso(), id],
  });

  if (decision === "accept" && valid.includes(category)) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO sources (id, page_url, page_name, category, is_verified, is_active, created_at) VALUES (?, ?, ?, ?, 0, 1, ?)",
      args: [
        crypto.randomUUID(),
        String(row.page_url),
        String(row.page_name ?? row.page_url),
        category,
        nowIso(),
      ],
    });
  }
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'submitted_pages', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, `submission.${decision}`, id, nowIso()],
  });
  return NextResponse.json({ ok: true });
}
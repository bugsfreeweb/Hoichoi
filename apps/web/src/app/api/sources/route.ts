import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso, mapSource } from "@hoichoi/db";
import type { CategorySlug } from "@hoichoi/shared-types";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM sources ORDER BY created_at DESC");
  return NextResponse.json({ sources: res.rows.map((r) => mapSource(r as Record<string, unknown>)) });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const body = (await req.json().catch(() => null)) as {
    pageUrl?: string;
    pageName?: string;
    category?: CategorySlug;
    isVerified?: boolean;
  } | null;
  if (!body?.pageUrl || !body.category) {
    return NextResponse.json({ error: "pageUrl and category required" }, { status: 400 });
  }
  const valid: CategorySlug[] = ["child-sexual-abuse", "extramarital-crime", "missing-children"];
  if (!valid.includes(body.category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  const client = getClient();
  try {
    await client.execute({
      sql: `
        INSERT INTO sources (id, page_url, page_name, category, is_verified, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `,
      args: [
        crypto.randomUUID(),
        body.pageUrl,
        body.pageName?.trim() || body.pageUrl,
        body.category,
        body.isVerified ? 1 : 0,
        nowIso(),
      ],
    });
  } catch {
    return NextResponse.json({ error: "source already exists" }, { status: 409 });
  }
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'sources', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "source.create", body.pageUrl, nowIso()],
  });
  return NextResponse.json({ ok: true });
}
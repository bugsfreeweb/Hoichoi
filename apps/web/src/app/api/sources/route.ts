import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso, mapSource, listCategories, getSourceCategories } from "@hoichoi/db";
import type { CategorySlug } from "@hoichoi/shared-types";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM sources ORDER BY created_at DESC");
  const rows = res.rows as Record<string, unknown>[];
  const sources = await Promise.all(
    rows.map(async (r) => mapSource(r, await getSourceCategories(String(r.id)))),
  );
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const body = (await req.json().catch(() => null)) as {
    pageUrl?: string;
    pageName?: string;
    category?: CategorySlug;
    categories?: CategorySlug[];
    allCategories?: boolean;
    isVerified?: boolean;
  } | null;
  if (!body?.pageUrl) {
    return NextResponse.json({ error: "pageUrl and category required" }, { status: 400 });
  }

  const active = (await listCategories()).map((c) => c.slug);
  // Resolve requested categories (allCategories fills every active category).
  const requested = body.allCategories
    ? active
    : (body.categories?.length ? body.categories : body.category ? [body.category] : []);
  const chosen = active.filter((c) => requested.includes(c));
  if (chosen.length === 0) {
    return NextResponse.json({ error: "invalid category — pick at least one active category" }, { status: 400 });
  }

  const client = getClient();
  const id = crypto.randomUUID();
  try {
    await client.execute({
      sql: `
        INSERT INTO sources (id, page_url, page_name, category, is_verified, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `,
      args: [
        id,
        body.pageUrl,
        body.pageName?.trim() || body.pageUrl,
        chosen[0]!,
        body.isVerified ? 1 : 0,
        nowIso(),
      ],
    });
  } catch {
    return NextResponse.json({ error: "source already exists" }, { status: 409 });
  }

  // Multi-category membership (authoritative source of truth).
  if (chosen.length > 0) {
    const values = chosen.map(() => "(?, ?)").join(", ");
    const args = chosen.flatMap((c) => [id, c]);
    await client.execute({ sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`, args });
  }

  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'sources', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "source.create", body.pageUrl, nowIso()],
  });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const body = (await req.json().catch(() => null)) as {
    sourceId?: string;
    pageUrl?: string;
    pageName?: string;
    category?: CategorySlug;
    categories?: CategorySlug[];
    isVerified?: boolean;
  } | null;
  if (!body?.sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const client = getClient();
  const active = (await listCategories()).map((c) => c.slug);
  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (body.pageUrl !== undefined) {
    sets.push("page_url = ?");
    args.push(body.pageUrl.trim());
  }
  if (body.pageName !== undefined) {
    sets.push("page_name = ?");
    args.push(body.pageName.trim());
  }
  if (body.category !== undefined || body.categories?.length) {
    const requested = body.categories?.length ? body.categories : body.category ? [body.category] : [];
    const chosen = active.filter((c) => requested.includes(c));
    if (chosen.length === 0) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    }
    if (body.category !== undefined) {
      sets.push("category = ?");
      args.push(body.category);
    } else {
      // multi-category: set category to first chosen (chosen.length > 111 guaranteed)
      sets.push("category = ?");
      args.push(chosen[0] as string);
    }
  }
  if (body.isVerified !== undefined) {
    sets.push("is_verified = ?");
    args.push(body.isVerified ? 1 : 0);
  }

// $FlowFixMe $TS-ignore
  // $FlowFixMe $TS-ignore
  sets.push("updated_at = ?");
  args.push(nowIso());
  args.push((body.sourceId as string).trim());

  try {
    await client.execute({
      sql: `UPDATE sources SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });
  } catch {
    return NextResponse.json({ error: "source update failed" }, { status: 409 });
  }

  const row = await client.execute({ sql: "SELECT * FROM sources WHERE id = ?", args: [body.sourceId] });
  const cats = await getSourceCategories(body.sourceId);
  const updatedSource = mapSource(row.rows[0] as Record<string, unknown>, cats);
  return NextResponse.json({ ok: true, source: updatedSource });
}

export async function DELETE(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId");
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const client = getClient();
  try {
    await client.execute({
      sql: "DELETE FROM sources WHERE id = ?",
      args: [sourceId],
    });
    await client.execute({
      sql: "DELETE FROM source_categories WHERE source_id = ?",
      args: [sourceId],
    });
    await client.execute({
      sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'sources', ?, ?)",
      args: [crypto.randomUUID(), user.user_id, "source.delete", sourceId, nowIso()],
    });
  } catch {
    return NextResponse.json({ error: "source delete failed" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
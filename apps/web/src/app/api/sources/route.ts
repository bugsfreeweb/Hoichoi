import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso, mapSource, listCategories, getSourceCategories } from "@hoichoi/db";
import type { CategorySlug } from "@hoichoi/shared-types";
import { normalizePlatform } from "@hoichoi/shared-types";
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
    platform?: string;
    kind?: string;
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
  const platform = normalizePlatform(body.platform);
  const kind = body.kind === "group" ? "group" : "page";
  try {
    await client.execute({
      sql: `
        INSERT INTO sources (id, page_url, page_name, category, is_verified, is_active, platform, kind, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      `,
      args: [
        id,
        body.pageUrl,
        body.pageName?.trim() || body.pageUrl,
        chosen[0]!,
        body.isVerified ? 1 : 0,
        platform,
        kind,
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
    platform?: string;
    kind?: string;
    category?: CategorySlug;
    categories?: CategorySlug[];
    isVerified?: boolean;
  } | null;
  if (!body?.sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const client = getClient();
  // Every configured category, not just the active ones. Filtering through the
  // active list used to silently delete memberships that pointed at a
  // deactivated category on any save, and the admin UI never renders those, so
  // the loss was invisible and unrecoverable.
  const known = new Set((await listCategories({ includeInactive: true })).map((c) => c.slug));
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
  if (body.platform !== undefined) {
    sets.push("platform = ?");
    args.push(normalizePlatform(body.platform));
  }
  if (body.kind !== undefined) {
    sets.push("kind = ?");
    args.push(body.kind === "group" ? "group" : "page");
  }

  // A request that carries no `categories` key at all is a partial edit and
  // must leave membership untouched. Only an explicit array replaces the set.
  const membershipSupplied = Array.isArray(body.categories);
  let chosen: string[] = [];
  if (membershipSupplied) {
    const requested = (body.categories as string[]).map(String).filter(Boolean);
    const unknown = requested.filter((c) => !known.has(c));
    if (unknown.length > 0) {
      return NextResponse.json({ error: `unknown category: ${unknown.join(", ")}` }, { status: 400 });
    }
    if (requested.length === 0) {
      return NextResponse.json({ error: "at least one category required" }, { status: 400 });
    }
    chosen = [...new Set(requested)];
  }
  // `category` on its own is only a primary-selection hint. It must never
  // collapse a multi-category source down to one row.
  if (membershipSupplied) {
    const primary = body.category && known.has(body.category) ? body.category : chosen[0] as string;
    sets.push("category = ?");
    args.push(primary);
  } else if (typeof body.category === "string" && known.has(body.category)) {
    sets.push("category = ?");
    args.push(body.category);
  }
  if (body.isVerified !== undefined) {
    sets.push("is_verified = ?");
    args.push(body.isVerified ? 1 : 0);
  }

  args.push((body.sourceId as string).trim());

  if (sets.length > 0) {
    try {
      await client.execute({
        sql: `UPDATE sources SET ${sets.join(", ")} WHERE id = ?`,
        args,
      });
    } catch {
      return NextResponse.json({ error: "source update failed" }, { status: 409 });
    }
  }

  // Replace membership only when the client explicitly sent the full set.
  if (membershipSupplied) {
    await client.execute({ sql: "DELETE FROM source_categories WHERE source_id = ?", args: [body.sourceId] });
    const values = chosen.map(() => "(?, ?)").join(", ");
    const catArgs = chosen.flatMap((c) => [body.sourceId as string, c]);
    await client.execute({ sql: `INSERT INTO source_categories (source_id, category_slug) VALUES ${values}`, args: catArgs });
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
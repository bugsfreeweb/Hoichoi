import { NextRequest, NextResponse } from "next/server";
import {
  getClient,
  nowIso,
  mapCategory,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listCategories,
} from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET() {
  const client = getClient();
  const res = await client.execute(
    "SELECT * FROM category_configs ORDER BY sort_order ASC, slug ASC",
  );
  const categories = res.rows.map((r) => mapCategory(r as Record<string, unknown>));
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    displayNameBn?: string;
    displayNameEn?: string;
    descriptionBn?: string;
    descriptionEn?: string;
    dot?: string;
    sortOrder?: number;
    showInFooter?: boolean;
    config?: { keywords?: string[] };
  } | null;
  if (!body?.slug || !body.displayNameBn || !body.displayNameEn) {
    return NextResponse.json({ error: "slug, displayNameBn, displayNameEn required" }, { status: 400 });
  }

  const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }
  const taken = (await listCategories()).map((c) => c.slug);
  if (taken.includes(slug)) {
    return NextResponse.json({ error: "slug already exists" }, { status: 409 });
  }

  try {
    await createCategory({
      slug,
      displayNameBn: body.displayNameBn.trim(),
      displayNameEn: body.displayNameEn.trim(),
      descriptionBn: body.descriptionBn?.trim() || undefined,
      descriptionEn: body.descriptionEn?.trim() || undefined,
      dot: body.dot?.trim() || undefined,
      sortOrder: body.sortOrder,
      showInFooter: body.showInFooter,
      // Admin-tuned keyword signals feed the classifier's detection (classify.ts).
      config: { keywords: (body.config?.keywords ?? []).map((k) => k.trim()).filter(Boolean) },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "create failed" }, { status: 500 });
  }

  const client = getClient();
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'categories', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "category.create", slug, nowIso()],
  });
  return NextResponse.json({ ok: true, category: await getCategory(slug) });
}

export async function PUT(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    fields?: Record<string, unknown>;
  } | null;
  if (!body?.slug || !body.fields) {
    return NextResponse.json({ error: "slug and fields required" }, { status: 400 });
  }

  try {
    await updateCategory(body.slug, {
      displayNameBn: typeof body.fields.displayNameBn === "string" ? body.fields.displayNameBn.trim() : undefined,
      displayNameEn: typeof body.fields.displayNameEn === "string" ? body.fields.displayNameEn.trim() : undefined,
      descriptionBn: typeof body.fields.descriptionBn === "string" ? body.fields.descriptionBn.trim() : undefined,
      descriptionEn: typeof body.fields.descriptionEn === "string" ? body.fields.descriptionEn.trim() : undefined,
      dot: typeof body.fields.dot === "string" ? body.fields.dot : undefined,
      sortOrder: typeof body.fields.sortOrder === "number" ? body.fields.sortOrder : undefined,
      showInFooter: typeof body.fields.showInFooter === "boolean" ? body.fields.showInFooter : undefined,
      isActive: typeof body.fields.isActive === "boolean" ? body.fields.isActive : undefined,
      config: (() => {
        const cfg = body.fields.config as { keywords?: unknown } | undefined;
        if (cfg && Array.isArray(cfg.keywords)) {
          return {
            ...cfg,
            keywords: cfg.keywords.map((k) => String(k).trim()).filter(Boolean),
          };
        }
        return undefined;
      })(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "update failed" }, { status: 500 });
  }

  const client = getClient();
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'categories', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "category.update", body.slug, nowIso()],
  });
  return NextResponse.json({ ok: true, category: await getCategory(body.slug) });
}

export async function DELETE(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    await deleteCategory(slug);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "delete failed" }, { status: 409 });
  }

  const client = getClient();
  await client.execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'categories', ?, ?)",
    args: [crypto.randomUUID(), user.user_id, "category.delete", slug, nowIso()],
  });
  return NextResponse.json({ ok: true });
}
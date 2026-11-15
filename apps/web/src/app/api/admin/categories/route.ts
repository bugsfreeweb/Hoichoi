import { requireApiRole } from "@/lib/auth";
import { listCategories, createCategory } from "@hoichoi/db";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  const categories = await listCategories();
  return NextResponse.json({ ok: true, categories });
}

export async function POST(request: Request) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  const body = await request.json();
  const { slug, displayNameBn, displayNameEn, descriptionBn, descriptionEn, dot, sortOrder, showInFooter } = body;

  if (!slug || !displayNameBn || !displayNameEn) {
    return NextResponse.json({ ok: false, error: "slug, displayNameBn, displayNameEn are required" }, { status: 400 });
  }

  await createCategory({
    slug,
    displayNameBn,
    displayNameEn,
    descriptionBn,
    descriptionEn,
    dot: dot || "#d2202c",
    sortOrder: sortOrder ?? 99,
    showInFooter,
  });

  return NextResponse.json({ ok: true });
}
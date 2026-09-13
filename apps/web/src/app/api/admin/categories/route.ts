import { requireApiUser, unauthorized } from "@/lib/auth";
import { listCategories, createCategory } from "@hoichoi/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const categories = await listCategories();
  return NextResponse.json({ ok: true, categories });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const { slug, displayNameBn, displayNameEn, descriptionBn, descriptionEn, dot, sortOrder } = body;

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
  });

  return NextResponse.json({ ok: true });
}
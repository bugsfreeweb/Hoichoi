import { requireAdminSession } from "@/lib/auth";
import { listCategories, createCategory } from "@hoichoi/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdminSession();
    const categories = await listCategories();
    return NextResponse.json({ ok: true, categories });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
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
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed to create category" }, { status: 500 });
  }
}
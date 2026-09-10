import { requireAdminSession } from "@/lib/auth";
import { updateCategory, deleteCategory } from "@hoichoi/db";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdminSession();
    const { slug } = await params;
    const body = await request.json();
    const { displayNameBn, displayNameEn, descriptionBn, descriptionEn, isActive, sortOrder, dot, config } = body;
    
    await updateCategory(slug, {
      displayNameBn,
      displayNameEn,
      descriptionBn,
      descriptionEn,
      isActive,
      sortOrder,
      dot,
      config,
    });
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdminSession();
    const { slug } = await params;
    
    await deleteCategory(slug);
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed to delete category" }, { status: 500 });
  }
}
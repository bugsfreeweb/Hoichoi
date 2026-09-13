import { requireApiUser, unauthorized } from "@/lib/auth";
import { updateCategory, deleteCategory } from "@hoichoi/db";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
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
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const { slug } = await params;

  await deleteCategory(slug);

  return NextResponse.json({ ok: true });
}
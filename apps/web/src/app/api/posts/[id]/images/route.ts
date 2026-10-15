import { NextRequest, NextResponse } from "next/server";
import {
  addPostImage,
  getPostById,
  listPostImages,
  removePostImage,
  setPrimaryPostImage,
  getClient,
  nowIso,
} from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

const isImageUrl = (u: string): boolean =>
  /^https?:\/\//i.test(u) || u.startsWith("/uploads/") || u.startsWith("/media/");

/** GET — gallery images attached to a post, in display order. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  if (!(await getPostById(id))) return NextResponse.json({ error: "post not found" }, { status: 404 });
  const images = await listPostImages(id);
  return NextResponse.json({ images });
}

/**
 * POST — attach an extra image to a post. Accepts a remote http(s) URL or a
 * local `/uploads/…` / `/media/…` path (the editor offers the already-scraped
 * media candidates, but an operator may paste any URL).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  if (!(await getPostById(id))) return NextResponse.json({ error: "post not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { url?: unknown; makePrimary?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  if (!isImageUrl(url)) return NextResponse.json({ error: "unsupported image url" }, { status: 400 });

  let image;
  try {
    image = await addPostImage(id, url, { kind: "image", source: "admin" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (body?.makePrimary === true) {
    await setPrimaryPostImage(id, image.id).catch(() => undefined);
  }

  await getClient().execute({
    sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, details, created_at) VALUES (?, ?, 'post.image.add', 'posts', ?, ?, ?)",
    args: [crypto.randomUUID(), user.user_id, id, JSON.stringify({ url, by: user.email }), nowIso()],
  });

  return NextResponse.json({ ok: true, image });
}

/** PATCH — promote a gallery image to the post's primary image. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const imageId = typeof body?.id === "string" ? body.id : "";
  if (!imageId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const path = await setPrimaryPostImage(id, imageId);
  if (!path) return NextResponse.json({ error: "image not found" }, { status: 404 });
  return NextResponse.json({ ok: true, media_path: path });
}

/** DELETE — remove a gallery image by id. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const imageId = typeof body?.id === "string" ? body.id : "";
  if (!imageId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const images = await listPostImages(id);
  if (!images.some((img) => img.id === imageId)) {
    return NextResponse.json({ error: "image not found" }, { status: 404 });
  }
  await removePostImage(imageId);
  return NextResponse.json({ ok: true });
}

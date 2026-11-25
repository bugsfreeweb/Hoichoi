/**
 * GET /api/posters/:id — the poster bytes a post or a crawler asks for.
 *
 * This is deliberately public and immutable-by-id: an og:image must be readable
 * without an admin session. The row is created only after a successful render,
 * so an unknown id is a plain 404.
 */
import { NextResponse } from "next/server";
import { getPosterImage } from "@hoichoi/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const row = await getPosterImage(id).catch(() => null);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const bytes = Buffer.from(row.data, "base64");
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "content-type": row.content_type,
      "content-length": String(bytes.length),
      // The id never changes its bytes.
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": `inline; filename="poster-${row.aspect.replace(":", "x")}.jpg"`,
    },
  });
}

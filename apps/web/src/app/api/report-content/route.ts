import { NextRequest, NextResponse } from "next/server";
import { getClient, getPostBySlug, nowIso } from "@hoichoi/db";

/** পাবলিক কনটেন্ট রিপোর্ট → removal_requests কিউ। */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    reason?: string;
    email?: string;
  } | null;
  if (!body?.slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const post = await getPostBySlug(body.slug);
  if (!post) {
    return NextResponse.json({ error: "unknown post slug" }, { status: 404 });
  }

  const client = getClient();
  await client.execute({
    sql: `
      INSERT INTO removal_requests (id, post_id, reason, reporter_email, status, created_at)
      VALUES (?, ?, ?, ?, 'open', ?)
    `,
    args: [
      crypto.randomUUID(),
      post.id,
      body.reason?.trim() || null,
      body.email?.trim() || null,
      nowIso(),
    ],
  });
  return NextResponse.json({ ok: true });
}
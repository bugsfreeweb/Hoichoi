import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { postComments } from "@/db/schema";
import { getPost } from "@/lib/posts";

export const dynamic = "force-dynamic";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const rows = await db
      .select()
      .from(postComments)
      .where(and(eq(postComments.postSlug, slug), eq(postComments.status, "published")))
      .orderBy(desc(postComments.createdAt))
      .limit(60);
    return NextResponse.json({ ok: true, comments: rows });
  } catch (error) {
    return NextResponse.json({ ok: false, comments: [], error: error instanceof Error ? error.message : "মন্তব্য লোড করা যায়নি" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return NextResponse.json({ ok: false, error: "প্রতিবেদনটি পাওয়া যায়নি" }, { status: 404 });

  const input = await request.json().catch(() => ({}));
  const author = clean(input?.author, 60);
  const body = clean(input?.body, 700);
  if (author.length < 2) return NextResponse.json({ ok: false, error: "নাম অন্তত ২ অক্ষরের হতে হবে" }, { status: 400 });
  if (body.length < 4) return NextResponse.json({ ok: false, error: "মন্তব্যটি অন্তত ৪ অক্ষরের লিখুন" }, { status: 400 });

  try {
    const [comment] = await db
      .insert(postComments)
      .values({ postSlug: slug, author, body, status: "published" })
      .returning();
    return NextResponse.json({ ok: true, comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "মন্তব্য পাঠানো যায়নি" }, { status: 503 });
  }
}

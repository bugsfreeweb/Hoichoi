import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { getArticleById } from "@/lib/data";

export const runtime = "nodejs";

/**
 * POST /api/comments  { articleId, author, body }
 * Public comments on articles. Light client-side validation + server guard;
 * content is rendered escaped in the UI (no HTML injection).
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { articleId, author, body } = (payload ?? {}) as {
    articleId?: unknown;
    author?: unknown;
    body?: unknown;
  };

  const idNum = Number(articleId);
  const authorStr = String(author ?? "").trim().slice(0, 60);
  const bodyStr = String(body ?? "").trim().slice(0, 800);

  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid article" }, { status: 400 });
  }
  if (!authorStr) {
    return NextResponse.json({ ok: false, error: "নাম লিখুন" }, { status: 400 });
  }
  if (bodyStr.length < 2) {
    return NextResponse.json({ ok: false, error: "মন্তব্য লিখুন" }, { status: 400 });
  }

  const article = await getArticleById(idNum);
  if (!article) {
    return NextResponse.json({ ok: false, error: "প্রতিবেদন পাওয়া যায়নি" }, { status: 404 });
  }

  try {
    const [row] = await db
      .insert(comments)
      .values({
        articleId: idNum,
        author: authorStr,
        body: bodyStr,
      })
      .returning();
    return NextResponse.json({ ok: true, comment: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Comment failed" },
      { status: 500 },
    );
  }
}

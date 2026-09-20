import { NextResponse } from "next/server";
import { db, tables } from "@/db";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { sameOrigin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const { comments: c, articles: a } = tables;
const headers = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const articleId = Number(new URL(req.url).searchParams.get("articleId"));
  if (!Number.isSafeInteger(articleId) || articleId <= 0) return NextResponse.json({ error: "Invalid article" }, { status: 400 });
  try {
    const comments = await db.select({ id: c.id, articleId: c.articleId, author: c.author, body: c.body, createdAt: c.createdAt })
      .from(c).innerJoin(a, eq(a.id, c.articleId))
      .where(and(eq(c.articleId, articleId), eq(c.status, "approved"), eq(a.status, "published")))
      .orderBy(desc(c.createdAt), desc(c.id)).limit(200);
    return NextResponse.json({ ok: true, comments }, { headers });
  } catch {
    return NextResponse.json({ error: "মন্তব্য লোড হয়নি। আবার চেষ্টা করুন।" }, { status: 503, headers });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  let payload;
  try {
    const text = await req.text();
    if (text.length > 12000) return NextResponse.json({ error: "মন্তব্যটি অতিরিক্ত বড়।" }, { status: 413 });
    payload = JSON.parse(text);
  } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { articleId, author, email, body, website } = payload ?? {};
  if (!Number.isSafeInteger(articleId) || articleId <= 0 || typeof author !== "string" || typeof body !== "string" || author.trim().length < 2 || author.trim().length > 60 || body.trim().length < 2 || body.trim().length > 800 || website) {
    return NextResponse.json({ error: "নাম (২–৬০) ও মন্তব্য (২–৮০০ অক্ষর) ঠিকভাবে লিখুন।" }, { status: 400 });
  }
  const emailTrimmed = typeof email === "string" ? email.trim() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailTrimmed || !emailRegex.test(emailTrimmed) || emailTrimmed.length > 120) {
    return NextResponse.json({ error: "একটি বৈধ ইমেইল ঠিকানা দিন।" }, { status: 400 });
  }
  try {
    const [article] = await db.select({ id: a.id }).from(a).where(and(eq(a.id, articleId), eq(a.status, "published")));
    if (!article) return NextResponse.json({ error: "প্রকাশিত প্রতিবেদন পাওয়া যায়নি।" }, { status: 404 });
    const [recent] = await db.select({ n: count() }).from(c).where(and(eq(c.author, author.trim()), gte(c.createdAt, new Date(Date.now() - 60_000))));
    if (Number(recent.n) >= 3) return NextResponse.json({ error: "এক মিনিট অপেক্ষা করে আবার মন্তব্য করুন।" }, { status: 429 });
    const [row] = await db.insert(c).values({ articleId, author: author.trim(), email: emailTrimmed, body: body.trim(), status: "pending", createdAt: new Date() }).returning({ id: c.id });
    return NextResponse.json({ ok: true, id: row.id, status: "pending", message: "মন্তব্য জমা হয়েছে। সম্পাদক অনুমোদন দিলে এখানে দেখা যাবে।" }, { status: 201, headers });
  } catch (error) {
    console.error("[comment:submit]", error);
    return NextResponse.json({ error: "মন্তব্য সংরক্ষিত হয়নি। একটু পরে আবার চেষ্টা করুন।" }, { status: 503, headers });
  }
}

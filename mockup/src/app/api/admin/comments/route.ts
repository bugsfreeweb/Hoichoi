import { NextResponse } from "next/server";
import { db, tables } from "@/db";
import { and, count, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { sessionFor, sameOrigin } from "@/lib/admin-auth";
import { COMMENT_STATUSES, type CommentStatus } from "@/lib/moderation-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const { comments: c, articles: a, moderationActions: actions } = tables;
const headers = { "Cache-Control": "private, no-store" };
const validStatus = (v: unknown): v is CommentStatus => COMMENT_STATUSES.includes(v as CommentStatus);

export async function GET(req: Request) {
  if (!sessionFor(req).authenticated) return NextResponse.json({ error: "মডারেটর হিসেবে প্রবেশ করুন।" }, { status: 401, headers });
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending";
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100).toLowerCase();
    const requestedPage = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const where = and(validStatus(status) ? eq(c.status, status) : undefined,
      q ? or(like(sql`lower(${c.author})`, `%${q}%`), like(sql`lower(${c.email})`, `%${q}%`), like(sql`lower(${c.body})`, `%${q}%`), like(sql`lower(${a.title})`, `%${q}%`)) : undefined);
    const [totals, [matched]] = await Promise.all([
      db.select({ status: c.status, n: count() }).from(c).groupBy(c.status),
      db.select({ n: count() }).from(c).innerJoin(a, eq(a.id, c.articleId)).where(where),
    ]);
    const counts = { pending: 0, approved: 0, rejected: 0, spam: 0 };
    for (const t of totals) if (validStatus(t.status)) counts[t.status] = Number(t.n);
    const pages = Math.max(1, Math.ceil(Number(matched.n) / 10));
    const page = Math.min(Math.floor(requestedPage), pages);
    const [rows, history] = await Promise.all([
      db.select({ id: c.id, articleId: c.articleId, author: c.author, email: c.email, body: c.body, status: c.status, createdAt: c.createdAt, reviewedAt: c.reviewedAt, moderatorNote: c.moderatorNote, articleTitle: a.title })
        .from(c).innerJoin(a, eq(a.id, c.articleId)).where(where).orderBy(desc(c.createdAt), desc(c.id)).limit(10).offset((page - 1) * 10),
      db.select({ id: actions.id, commentId: actions.commentId, author: c.author, fromStatus: actions.fromStatus, toStatus: actions.toStatus, note: actions.note, actor: actions.actor, origin: actions.origin, createdAt: actions.createdAt })
        .from(actions).innerJoin(c, eq(c.id, actions.commentId)).orderBy(desc(actions.id)).limit(15),
    ]);
    return NextResponse.json({ ok: true, rows, counts, history, page, pages, total: Number(matched.n), updatedAt: new Date().toISOString() }, { headers });
  } catch (error) {
    console.error("[moderation:list]", error);
    return NextResponse.json({ error: "মন্তব্য লোড হয়নি। ডাটাবেস মাইগ্রেশন ও সংযোগ পরীক্ষা করুন।" }, { status: 503, headers });
  }
}

export async function PATCH(req: Request) {
  const session = sessionFor(req);
  if (!session.authenticated) return NextResponse.json({ error: "মডারেটর হিসেবে প্রবেশ করুন।" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  let payload;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { ids, status, note = "", origin = "web" } = payload ?? {};
  if (!Array.isArray(ids) || !ids.length || ids.length > 50 || !ids.every(n => Number.isSafeInteger(n) && n > 0) || !validStatus(status) || typeof note !== "string" || note.length > 500 || !["web", "desktop", "vanilla"].includes(origin)) {
    return NextResponse.json({ error: "সঠিক মন্তব্য ও অ্যাকশন নির্বাচন করুন (সর্বোচ্চ ৫০টি)।" }, { status: 400 });
  }
  try {
    const uniqueIds = [...new Set<number>(ids)];
    const updated = await db.transaction(async tx => {
      const previous = await tx.select().from(c).where(inArray(c.id, uniqueIds));
      if (previous.length !== uniqueIds.length) throw new Error("COMMENT_NOT_FOUND");
      const changed: number[] = [];
      for (const row of previous) {
        if (row.status === status && row.moderatorNote === note.trim()) continue;
        const now = new Date();
        const result = await tx.update(c).set({ status, moderatorNote: note.trim(), reviewedAt: now })
          .where(and(eq(c.id, row.id), eq(c.status, row.status))).returning({ id: c.id });
        if (!result.length) throw new Error("CONCURRENT_REVIEW");
        await tx.insert(actions).values({ commentId: row.id, fromStatus: row.status, toStatus: status, note: note.trim(), actor: session.mode === "demo" ? "demo moderator" : "admin", origin, createdAt: now });
        changed.push(row.id);
      }
      return changed;
    });
    return NextResponse.json({ ok: true, updated, status, updatedAt: new Date().toISOString() }, { headers });
  } catch (error) {
    console.error("[moderation:update]", error);
    return NextResponse.json({ error: "পরিবর্তন সংরক্ষিত হয়নি। রিফ্রেশ করে আবার চেষ্টা করুন।" }, { status: 409 });
  }
}

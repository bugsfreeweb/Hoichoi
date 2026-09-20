import { NextResponse } from "next/server";
import { db, tables } from "@/db";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { sameOrigin, sessionFor } from "@/lib/admin-auth";
import { REPORT_REASONS } from "@/lib/moderation-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { reports: r, articles: a } = tables;
const headers = { "Cache-Control": "no-store" };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  let payload;
  try {
    const text = await req.text();
    if (text.length > 12000) return NextResponse.json({ error: "রিপোর্টটি অতিরিক্ত বড়।" }, { status: 413 });
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { articleId, reporterName, reporterEmail, reason, details } = payload ?? {};

  if (!Number.isSafeInteger(articleId) || articleId <= 0) {
    return NextResponse.json({ error: "প্রতিবেদন পাওয়া যায়নি।" }, { status: 400 });
  }
  if (typeof reporterName !== "string" || reporterName.trim().length < 2 || reporterName.trim().length > 60) {
    return NextResponse.json({ error: "নাম (২–৬০ অক্ষর) ঠিকভাবে লিখুন।" }, { status: 400 });
  }
  const emailTrimmed = typeof reporterEmail === "string" ? reporterEmail.trim() : "";
  if (!emailTrimmed || !emailRegex.test(emailTrimmed) || emailTrimmed.length > 120) {
    return NextResponse.json({ error: "একটি বৈধ ইমেইল ঠিকানা দিন।" }, { status: 400 });
  }
  if (typeof reason !== "string" || !REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) {
    return NextResponse.json({ error: "একটি কারণ নির্বাচন করুন।" }, { status: 400 });
  }
  const detailsTrimmed = typeof details === "string" ? details.trim().slice(0, 500) : "";

  try {
    // Readers can only report a story that is actually published.
    const [article] = await db.select({ id: a.id }).from(a).where(and(eq(a.id, articleId), eq(a.status, "published")));
    if (!article) return NextResponse.json({ error: "প্রকাশিত প্রতিবেদন পাওয়া যায়নি।" }, { status: 404 });

    // Burst limit: max 3 reports per email per 5 minutes
    const [recent] = await db.select({ n: count() }).from(r).where(
      and(eq(r.reporterEmail, emailTrimmed), gte(r.createdAt, new Date(Date.now() - 5 * 60_000)))
    );
    if (Number(recent.n) >= 3) {
      return NextResponse.json({ error: "কয়েক মিনিট অপেক্ষা করে আবার রিপোর্ট করুন।" }, { status: 429 });
    }

    const [row] = await db.insert(r).values({
      articleId,
      reporterName: reporterName.trim(),
      reporterEmail: emailTrimmed,
      reason,
      details: detailsTrimmed,
      status: "open",
      createdAt: new Date(),
    }).returning({ id: r.id });

    return NextResponse.json({
      ok: true,
      id: row.id,
      message: "রিপোর্ট জমা হয়েছে। সম্পাদকীয় দল পর্যালোচনা করবে।",
    }, { status: 201, headers });
  } catch (error) {
    console.error("[report:submit]", error);
    return NextResponse.json({ error: "রিপোর্ট সংরক্ষিত হয়নি। একটু পরে আবার চেষ্টা করুন।" }, { status: 503, headers });
  }
}

/**
 * Moderator-only: list reader reports as JSON.
 * Uses the same signed moderator session/cookie as /api/admin/comments — the
 * old "any non-empty x-admin-key header" check authenticated nobody.
 */
export async function GET(req: Request) {
  if (!sessionFor(req).authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  try {
    const rows = await db.select({
      id: r.id,
      articleId: r.articleId,
      reporterName: r.reporterName,
      reporterEmail: r.reporterEmail,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
    }).from(r).orderBy(desc(r.createdAt)).limit(200);
    return NextResponse.json({ ok: true, reports: rows }, { headers });
  } catch {
    return NextResponse.json({ error: "রিপোর্ট লোড হয়নি।" }, { status: 503, headers });
  }
}
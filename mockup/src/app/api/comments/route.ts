import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { getArticleById } from "@/lib/data";
import { moderate, getActiveBan, clientIp } from "@/lib/moderation";

export const runtime = "nodejs";

const banMsg: Record<string, string> = {
  "7d": "আপনার আইপি ৭ দিনের জন্য সীমাবদ্ধ (আপত্তিকর মন্তব্য)।",
  "30d": "আপনার আইপি ৩০ দিনের জন্য সীমাবদ্ধ (পুনরাবৃত্ত লঙ্ঘন)।",
  permanent: "আপনার আইপি স্থায়ীভাবে সীমাবদ্ধ করা হয়েছে।",
};

/**
 * POST /api/comments  { articleId, author, body }
 * Auto-moderation pipeline:
 *   1) active IP ban → 403
 *   2) offensive-word scan → approve | hold (pending) | block + escalate IP ban
 * Only "approved" comments are returned to the reader; the rest are held for
 * the admin moderation queue.
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
  const ip = clientIp(req);

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

  // 1) active ban gate
  const activeBan = await getActiveBan(ip);
  if (activeBan) {
    return NextResponse.json(
      { ok: false, banned: true, scope: activeBan.scope, error: banMsg[activeBan.scope] },
      { status: 403 },
    );
  }

  // 2) auto-moderate
  const verdict = await moderate(bodyStr, ip);

  try {
    const [row] = await db
      .insert(comments)
      .values({
        articleId: idNum,
        author: authorStr,
        body: bodyStr,
        ip,
        status: verdict.status,
        flagged: verdict.flagged.join(", "),
        autoModerated: verdict.status !== "approved",
      })
      .returning();

    if (verdict.status === "approved") {
      return NextResponse.json({ ok: true, status: "approved", comment: row }, { status: 201 });
    }

    if (verdict.status === "blocked") {
      return NextResponse.json(
        {
          ok: false,
          status: "blocked",
          banned: !!verdict.banned,
          scope: verdict.banned?.scope ?? null,
          error:
            "আপনার মন্তব্যে আপত্তিকর শব্দ শনাক্ত হওয়ায় তা স্বয়ংক্রিয়ভাবে মুছে দেওয়া হয়েছে" +
            (verdict.banned ? ` — ${banMsg[verdict.banned.scope]}` : "।"),
        },
        { status: 200 },
      );
    }

    // pending
    return NextResponse.json(
      {
        ok: false,
        status: "pending",
        error: "আপনার মন্তব্যটি পর্যালোচনার জন্য অপেক্ষমাণ; অনুমোদনের পর প্রকাশিত হবে।",
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Comment failed" },
      { status: 500 },
    );
  }
}

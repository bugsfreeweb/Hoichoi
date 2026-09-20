import { NextResponse } from "next/server";
import { db, tables, DRIVER_LABEL } from "@/db";
import { count, desc, eq } from "drizzle-orm";
import { sameOrigin } from "@/lib/admin-auth";
import { ensureReady } from "@/lib/db-bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { articles: a, pipelineRuns: runs } = tables;
const headers = { "Cache-Control": "no-store" };

/**
 * Web ⇄ Desktop resync (one click on either surface).
 *
 *  POST { direction: "desktop-to-web" }  → the desk has fresh items: publish
 *        every still-pending article on the web and log a pipeline run.
 *  POST { direction: "web-to-desktop" }  → hand the latest published articles
 *        back to the desktop controller (it stores lastSyncAt + refreshes).
 *  GET  → a small manifest (counts, driver, latest publication) both UIs use
 *         to show what a sync would exchange.
 *
 * POST is same-origin gated like every other public mutation; GET is open.
 */

async function manifest() {
  const rows = await db.select({ status: a.status, n: count() }).from(a).groupBy(a.status);
  const counts = { published: 0, pending: 0, duplicate: 0 };
  for (const r of rows) {
    if (r.status === "published") counts.published = Number(r.n);
    else if (r.status === "pending") counts.pending = Number(r.n);
    else if (r.status === "duplicate") counts.duplicate = Number(r.n);
  }
  const [latest] = await db
    .select({ publishedAt: a.publishedAt })
    .from(a)
    .where(eq(a.status, "published"))
    .orderBy(desc(a.publishedAt))
    .limit(1);
  const [lastRun] = await db
    .select({ startedAt: runs.startedAt, status: runs.status, published: runs.published })
    .from(runs)
    .orderBy(desc(runs.startedAt))
    .limit(1);
  return {
    ok: true,
    driver: DRIVER_LABEL,
    counts,
    latestPublishedAt: latest?.publishedAt?.toISOString() ?? null,
    lastRun: lastRun
      ? { startedAt: lastRun.startedAt.toISOString(), status: lastRun.status, published: lastRun.published }
      : null,
    at: new Date().toISOString(),
  };
}

export async function GET() {
  await ensureReady();
  try {
    return NextResponse.json(await manifest(), { headers });
  } catch (error) {
    console.error("[sync:manifest]", error);
    return NextResponse.json({ ok: false, error: "রিসিঙ্ক স্ট্যাটাস লোড হয়নি।" }, { status: 503, headers });
  }
}

function publishDesktopToWeb() {
  const started = Date.now();
  return db
    .update(a)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(a.status, "pending"))
    .returning({ id: a.id })
    .then((publishedRows) => {
      const published = publishedRows.length;
      return db
        .insert(runs)
        .values({
          startedAt: new Date(),
          trigger: "sync",
          status: "success",
          collected: 0,
          duplicates: 0,
          published,
          durationSec: Math.max(1, Math.round((Date.now() - started) / 1000)),
          note: "RESYNC · desktop → web publish",
        })
        .then(async () => ({
          direction: "desktop-to-web" as const,
          published,
          message: published > 0 ? `ওয়েবে ${published} টি প্রতিবেদন প্রকাশিত হয়েছে।` : "ওয়েব ইতিমধ্যেই আপ-টু-ডেট।",
          ...(await manifest()),
        }));
    });
}

async function pullWebToDesktop() {
  const rows = await db
    .select({
      id: a.id, title: a.title, category: a.category, location: a.location,
      sourceName: a.sourceName, hash: a.hash, status: a.status,
      collectedAt: a.collectedAt, publishedAt: a.publishedAt,
    })
    .from(a)
    .where(eq(a.status, "published"))
    .orderBy(desc(a.publishedAt))
    .limit(25);
  return {
    ok: true,
    direction: "web-to-desktop" as const,
    total: rows.length,
    articles: rows.map((r) => ({
      ...r,
      collectedAt: r.collectedAt.toISOString(),
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    })),
    message: `ওয়েব থেকে ${rows.length} টি প্রতিবেদন ডেস্কে এসেছে।`,
    at: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  await ensureReady();
  let direction = "";
  try {
    const body = await req.json();
    direction = typeof body?.direction === "string" ? body.direction : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // "auto" = the smart one-click resync: if the desk still holds pending
    // articles, push them live on the web; otherwise pull the latest back.
    if (direction === "auto") {
      const m = await manifest();
      const target = m.counts.pending > 0 ? "desktop-to-web" : "web-to-desktop";
      return NextResponse.json(
        target === "desktop-to-web"
          ? await publishDesktopToWeb()
          : await pullWebToDesktop(),
        { headers },
      );
    }

    if (direction === "desktop-to-web") {
      return NextResponse.json(await publishDesktopToWeb(), { headers });
    }

    if (direction === "web-to-desktop") {
      return NextResponse.json(await pullWebToDesktop(), { headers });
    }

    return NextResponse.json({ error: "অজানা সিঙ্ক দিক — desktop-to-web, web-to-desktop অথবা auto দিন।" }, { status: 400, headers });
  } catch (error) {
    console.error("[sync]", error);
    return NextResponse.json({ ok: false, error: "রিসিঙ্ক সম্পন্ন হয়নি। ডাটাবেস সংযোগ পরীক্ষা করুন।" }, { status: 503, headers });
  }
}

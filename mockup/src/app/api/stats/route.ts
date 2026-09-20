import { db, tables, DB_DRIVER, DRIVER_LABEL } from "@/db";
import { count, desc, eq } from "drizzle-orm";
import type { AnalyticsRange, AnalyticsSnapshot } from "@/lib/analytics-types";
import { ensureReady } from "@/lib/db-bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };

/** Public aggregate metrics. No keys, private comment text, or invented counters. */
export async function GET(req: Request) {
  await ensureReady();
  const candidate = new URL(req.url).searchParams.get("range");
  const range: AnalyticsRange = candidate === "24h" || candidate === "7d" ? candidate : "all";
  const { articles, comments, sources, pipelineRuns, serviceHeartbeats } = tables;
  try {
    const start = performance.now();
    await db.select({ n: count() }).from(articles);
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    const [items, commentTimes, sourceStates, runs, heartbeat, publicArticles] = await Promise.all([
      db.select({ status: articles.status, category: articles.category, collectedAt: articles.collectedAt, publishedAt: articles.publishedAt }).from(articles),
      db.select({ createdAt: comments.createdAt, reviewedAt: comments.reviewedAt }).from(comments).where(eq(comments.status, "approved")),
      db.select({ status: sources.status }).from(sources),
      db.select({ startedAt: pipelineRuns.startedAt, durationSec: pipelineRuns.durationSec }).from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).limit(500),
      db.select().from(serviceHeartbeats).where(eq(serviceHeartbeats.service, "collector")),
      db.select({ id: articles.id, title: articles.title, publishedAt: articles.publishedAt }).from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt)).limit(6),
    ]);
    const now = Date.now(); const day = 86_400_000;
    const dates = items.map(a => a.collectedAt.getTime()).filter(Number.isFinite);
    const earliest = dates.length ? Math.min(...dates) : now - day;
    const from = range === "24h" ? now - day : range === "7d" ? now - 7 * day : Math.min(earliest - 3_600_000, now - day);
    const bins = range === "7d" ? 7 : 12;
    const step = (now - from) / bins;
    const series = Array.from({ length: bins }, (_, i) => ({ at: new Date(from + i * step).toISOString(), collected: 0, published: 0 }));
    const inside = (d: Date | null) => !!d && d.getTime() >= from && d.getTime() <= now;
    const index = (d: Date) => Math.min(bins - 1, Math.max(0, Math.floor((d.getTime() - from) / step)));
    const totals = { collected: 0, published: 0, duplicates: 0, approvedComments: 0, pendingArticles: 0 };
    const allArticles = { published: 0, pending: 0, duplicate: 0 };
    const categoryCounts: Record<string, number> = {};
    for (const a of items) {
      allArticles[a.status]++;
      if (inside(a.collectedAt)) {
        totals.collected++; series[index(a.collectedAt)].collected++;
        if (a.status === "duplicate") totals.duplicates++;
        if (a.status === "pending") totals.pendingArticles++;
        categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      }
      if (a.status === "published" && inside(a.publishedAt)) { totals.published++; series[index(a.publishedAt!)].published++; }
    }
    totals.approvedComments = commentTimes.filter(c => inside(c.reviewedAt ?? c.createdAt)).length;
    const statuses = { watching: 0, paused: 0, error: 0, total: sourceStates.length };
    for (const s of sourceStates) statuses[s.status]++;
    const h = heartbeat[0];
    const collector: AnalyticsSnapshot["collector"] = {
      status: !h ? "not_connected" : now - h.lastSeenAt.getTime() > 90_000 ? "offline" : h.state,
      lastSeenAt: h?.lastSeenAt.toISOString() ?? null,
    };
    const selectedRuns = runs.filter(r => inside(r.startedAt));
    const activity: AnalyticsSnapshot["activity"] = publicArticles.filter(a => a.publishedAt).map(a => ({ id: `a${a.id}`, kind: "article", text: a.title, at: a.publishedAt!.toISOString(), href: `/news/${a.id}` }));
    const snapshot: AnalyticsSnapshot = {
      ok: true, generatedAt: new Date(now).toISOString(), range, from: new Date(from).toISOString(), to: new Date(now).toISOString(),
      database: { driver: DRIVER_LABEL, mode: DB_DRIVER === "turso" && (!process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL.startsWith("file:")) ? "local" : "cloud", latencyMs },
      totals, allArticles, categories: Object.entries(categoryCounts).map(([key, count]) => ({ key, count })), series, sources: statuses, collector,
      latestPublication: publicArticles[0]?.publishedAt?.toISOString() ?? null, activity,
      runSummary: { count: selectedRuns.length, durationSec: selectedRuns.length ? Math.round(selectedRuns.reduce((s,r) => s+r.durationSec,0)/selectedRuns.length) : null, lastAt: runs[0]?.startedAt.toISOString() ?? null },
    };
    return Response.json(snapshot, { headers });
  } catch (error) {
    console.error("[stats]", error);
    return Response.json({ ok: false, error: "পরিসংখ্যান পাওয়া যায়নি। সংযোগ বা ডাটাবেস মাইগ্রেশন পরীক্ষা করুন।", generatedAt: new Date().toISOString() }, { status: 503, headers });
  }
}

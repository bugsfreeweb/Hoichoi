import { db, tables } from "@/db";
import { and, count, desc, eq } from "drizzle-orm";
import type { ReportStatus } from "./moderation-types";

const { articles, apiKeys, pipelineRuns, sources, collectorLogs, comments, reports } =
  tables;

/* re-export pure helpers so server components can use one import site */
export * from "./format";

export type Article = typeof articles.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Run = typeof pipelineRuns.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type CollectorLog = typeof collectorLogs.$inferSelect;
export type Comment = typeof comments.$inferSelect;

/** Serializable article shape for client components (Dates -> ISO strings). */
export type ArticleLite = Omit<Article, "collectedAt" | "publishedAt"> & {
  collectedAt: string;
  publishedAt: string | null;
};

export type RunLite = Omit<Run, "startedAt"> & { startedAt: string };

export type SourceLite = Omit<Source, "lastChecked" | "lastPostAt"> & {
  lastChecked: string | null;
  lastPostAt: string | null;
};

export type LogLite = Omit<CollectorLog, "ts"> & { ts: string };

export type CommentLite = Omit<Comment, "createdAt"> & { createdAt: string };

export const lite = (a: Article): ArticleLite => ({
  ...a,
  collectedAt: a.collectedAt.toISOString(),
  publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
});

export const runLite = (r: Run): RunLite => ({
  ...r,
  startedAt: r.startedAt.toISOString(),
});

export const sourceLite = (s: Source): SourceLite => ({
  ...s,
  lastChecked: s.lastChecked ? s.lastChecked.toISOString() : null,
  lastPostAt: s.lastPostAt ? s.lastPostAt.toISOString() : null,
});

export const logLite = (l: CollectorLog): LogLite => ({
  ...l,
  ts: l.ts.toISOString(),
});

export const commentLite = (c: Comment) => ({
  id: c.id, articleId: c.articleId, author: c.author, body: c.body,
  createdAt: c.createdAt.toISOString(),
});

export type ReportLite = {
  id: number; articleId: number; reporterName: string; reporterEmail: string;
  reason: string; details: string; status: ReportStatus; createdAt: string;
};

/** Reader reports for the /admin/reports queue (newest first, newest 200). */
export async function getReports(): Promise<ReportLite[]> {
  try {
    const rows = await db.select({
      id: reports.id, articleId: reports.articleId, reporterName: reports.reporterName,
      reporterEmail: reports.reporterEmail, reason: reports.reason, details: reports.details,
      status: reports.status, createdAt: reports.createdAt,
    }).from(reports).orderBy(desc(reports.createdAt)).limit(200);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* queries — every call is fault tolerant so the mockup still renders  */
/* ------------------------------------------------------------------ */

export async function getArticles(): Promise<Article[]> {
  try {
    return await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt), desc(articles.collectedAt));
  } catch {
    return [];
  }
}

export async function getArticleById(id: number): Promise<Article | null> {
  try {
    const rows = await db.select().from(articles).where(eq(articles.id, id));
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getRelated(category: string, excludeId: number) {
  try {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.category, category))
      .orderBy(desc(articles.publishedAt))
      .limit(4)
      .then((rows) => rows.filter((r) => r.id !== excludeId).slice(0, 3));
  } catch {
    return [];
  }
}

export async function getKeys(): Promise<ApiKey[]> {
  try {
    return await db.select().from(apiKeys).orderBy(apiKeys.id);
  } catch {
    return [];
  }
}

export async function getRuns(): Promise<Run[]> {
  try {
    return await db
      .select()
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt));
  } catch {
    return [];
  }
}

export async function getSources(): Promise<Source[]> {
  try {
    return await db.select().from(sources).orderBy(sources.id);
  } catch {
    return [];
  }
}

export async function getLogs(): Promise<CollectorLog[]> {
  try {
    return await db
      .select()
      .from(collectorLogs)
      .orderBy(desc(collectorLogs.ts))
      .limit(48);
  } catch {
    return [];
  }
}

export async function getComments(articleId: number): Promise<Comment[]> {
  try {
    return await db
      .select()
      .from(comments)
      .where(and(eq(comments.articleId, articleId), eq(comments.status, "approved")))
      .orderBy(desc(comments.createdAt))
      .limit(200);
  } catch {
    return [];
  }
}

/** Moderation queue counts by status — fault tolerant, numbers only. */
export async function getCommentStatusCounts(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  spam: number;
}> {
  const fallback = { pending: 0, approved: 0, rejected: 0, spam: 0 };
  try {
    const rows = await db
      .select({ status: comments.status, n: count() })
      .from(comments)
      .groupBy(comments.status);
    const out = { ...fallback };
    for (const r of rows) {
      if (r.status === "pending") out.pending = Number(r.n);
      else if (r.status === "approved") out.approved = Number(r.n);
      else if (r.status === "rejected") out.rejected = Number(r.n);
      else if (r.status === "spam") out.spam = Number(r.n);
    }
    return out;
  } catch {
    return fallback;
  }
}

/** Canonical moderation constants live in one module — re-exported for callers
 *  that import everything from "@/lib/data". */
export { COMMENT_STATUSES, COMMENT_LABELS, type CommentStatus } from "./moderation-types";


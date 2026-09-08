import { db } from "@/db";
import {
  articles,
  apiKeys,
  pipelineRuns,
  sources,
  collectorLogs,
  comments,
  ipBans,
  bannedWords,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export * from "./format";

export type Article = typeof articles.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Run = typeof pipelineRuns.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type CollectorLog = typeof collectorLogs.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type IpBan = typeof ipBans.$inferSelect;
export type BannedWord = typeof bannedWords.$inferSelect;

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

export type CommentLite = Omit<Comment, "createdAt"> & { createdAt: string };

export const commentLite = (c: Comment): CommentLite => ({
  ...c,
  createdAt: c.createdAt.toISOString(),
});

export type IpBanLite = Omit<IpBan, "createdAt" | "expiresAt"> & {
  createdAt: string;
  expiresAt: string | null;
};

export const ipBanLite = (b: IpBan): IpBanLite => ({
  ...b,
  createdAt: b.createdAt.toISOString(),
  expiresAt: b.expiresAt ? b.expiresAt.toISOString() : null,
});

export type BannedWordLite = Omit<BannedWord, "createdAt"> & {
  createdAt: string;
};

export const bannedWordLite = (w: BannedWord): BannedWordLite => ({
  ...w,
  createdAt: w.createdAt.toISOString(),
});

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

/** Public view — only approved comments are shown to readers. */
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

/** Admin view — every comment regardless of status, newest first. */
export async function getAllComments(): Promise<Comment[]> {
  try {
    return await db
      .select()
      .from(comments)
      .orderBy(desc(comments.createdAt))
      .limit(500);
  } catch {
    return [];
  }
}

export async function getIpBans(): Promise<IpBan[]> {
  try {
    return await db.select().from(ipBans).orderBy(desc(ipBans.createdAt)).limit(200);
  } catch {
    return [];
  }
}

export async function getBannedWords(): Promise<BannedWord[]> {
  try {
    return await db.select().from(bannedWords).orderBy(desc(bannedWords.severity));
  } catch {
    return [];
  }
}

export const sqlNow = sql`NOW()`;

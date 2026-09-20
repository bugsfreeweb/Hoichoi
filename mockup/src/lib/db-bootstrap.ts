import { DB_DRIVER, db, raw, tables } from "@/db";
import { migrateModeration } from "@/db/moderation-migration";
import { SEED_ARTICLES, SEED_COMMENTS, SEED_KEYS, SEED_LOGS, SEED_REPORTS, SEED_RUNS, SEED_SOURCES } from "./seed-data";

/**
 * Single source of truth for schema creation + demo seeding, shared by:
 *  • GET /api/setup      (explicit, key-guarded bootstrap)
 *  • ensureReady()       (automatic first-run bootstrap so a fresh deploy
 *                         shows content instead of an empty shell)
 *
 * Everything is namespaced `hoichoi_*` and strictly additive: we create only
 * our own tables and never modify, adopt or drop tables that already exist
 * (e.g. another application's `posts` / `comments` / `sources`).
 */

const T = {
  articles: "hoichoi_articles",
  apiKeys: "hoichoi_api_keys",
  runs: "hoichoi_pipeline_runs",
  sources: "hoichoi_sources",
  logs: "hoichoi_collector_logs",
  comments: "hoichoi_comments",
  reports: "hoichoi_reports",
};

async function runAll(sqlText: string) {
  // libSQL execute() accepts one statement at a time.
  if (DB_DRIVER === "turso") {
    for (const part of sqlText.split(";")) {
      if (part.trim()) await raw(part + ";");
    }
    return;
  }
  await raw(sqlText);
}

async function createTables() {
  if (DB_DRIVER === "turso") {
    const int = "INTEGER";
    await runAll(`
      CREATE TABLE IF NOT EXISTS ${T.articles} (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, dek TEXT NOT NULL, body TEXT NOT NULL,
        category TEXT NOT NULL, location TEXT NOT NULL DEFAULT 'ঢাকা',
        source_name TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '#',
        fb_excerpt TEXT NOT NULL, fb_author TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL, image_credit TEXT NOT NULL DEFAULT '',
        hash TEXT NOT NULL UNIQUE, reading_minutes ${int} NOT NULL DEFAULT 3,
        featured ${int} NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        collected_at ${int} NOT NULL, published_at ${int}
      );
      CREATE TABLE IF NOT EXISTS ${T.apiKeys} (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL, service TEXT NOT NULL, env_name TEXT NOT NULL,
        masked_value TEXT NOT NULL, reveal_value TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'both', status TEXT NOT NULL DEFAULT 'active',
        rotated_at TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS ${T.runs} (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        started_at ${int} NOT NULL, trigger TEXT NOT NULL DEFAULT 'cron',
        status TEXT NOT NULL DEFAULT 'success', collected ${int} NOT NULL DEFAULT 0,
        duplicates ${int} NOT NULL DEFAULT 0, published ${int} NOT NULL DEFAULT 0,
        duration_sec ${int} NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS ${T.sources} (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'page', fb_id TEXT NOT NULL,
        handle TEXT NOT NULL DEFAULT '', topics TEXT NOT NULL DEFAULT '',
        last_checked ${int}, last_post_at ${int},
        status TEXT NOT NULL DEFAULT 'watching', posts_today ${int} NOT NULL DEFAULT 0,
        health ${int} NOT NULL DEFAULT 100, note TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS ${T.logs} (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        ts ${int} NOT NULL, level TEXT NOT NULL DEFAULT 'info',
        stage TEXT NOT NULL, message TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${T.comments} (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        article_id ${int} NOT NULL REFERENCES ${T.articles}(id) ON DELETE CASCADE,
        author TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL, likes ${int} NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        moderator_note TEXT NOT NULL DEFAULT '', reviewed_at ${int},
        created_at ${int} NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${T.reports} (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        article_id ${int} NOT NULL REFERENCES ${T.articles}(id) ON DELETE CASCADE,
        reporter_name TEXT NOT NULL, reporter_email TEXT NOT NULL,
        reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open', created_at ${int} NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hoichoi_moderation_actions (
        id ${int} PRIMARY KEY AUTOINCREMENT,
        comment_id ${int} NOT NULL REFERENCES ${T.comments}(id) ON DELETE CASCADE,
        from_status TEXT NOT NULL, to_status TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '', actor TEXT NOT NULL DEFAULT 'admin',
        origin TEXT NOT NULL DEFAULT 'web', created_at ${int} NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hoichoi_service_heartbeats (
        service TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'ready', last_seen_at ${int} NOT NULL
      );
    `);
    return;
  }

  await raw(`
    DO $$ BEGIN CREATE TYPE hoichoi_article_status AS ENUM ('published','pending','duplicate'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE hoichoi_key_scope AS ENUM ('desktop','web','both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE hoichoi_source_kind AS ENUM ('page','group'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE hoichoi_source_status AS ENUM ('watching','paused','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE hoichoi_log_level AS ENUM ('info','ok','warn','err'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE TABLE IF NOT EXISTS ${T.articles} (
      id SERIAL PRIMARY KEY, title TEXT NOT NULL, dek TEXT NOT NULL, body TEXT NOT NULL,
      category TEXT NOT NULL, location TEXT NOT NULL DEFAULT 'ঢাকা',
      source_name TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '#',
      fb_excerpt TEXT NOT NULL, fb_author TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL, image_credit TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL UNIQUE, reading_minutes INTEGER NOT NULL DEFAULT 3,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      status hoichoi_article_status NOT NULL DEFAULT 'pending',
      collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), published_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS ${T.apiKeys} (
      id SERIAL PRIMARY KEY, label TEXT NOT NULL, service TEXT NOT NULL,
      env_name TEXT NOT NULL, masked_value TEXT NOT NULL, reveal_value TEXT NOT NULL,
      scope hoichoi_key_scope NOT NULL DEFAULT 'both', status TEXT NOT NULL DEFAULT 'active',
      rotated_at TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ${T.runs} (
      id SERIAL PRIMARY KEY, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      trigger TEXT NOT NULL DEFAULT 'cron', status TEXT NOT NULL DEFAULT 'success',
      collected INTEGER NOT NULL DEFAULT 0, duplicates INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 0, duration_sec INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ${T.sources} (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL,
      kind hoichoi_source_kind NOT NULL DEFAULT 'page', fb_id TEXT NOT NULL,
      handle TEXT NOT NULL DEFAULT '', topics TEXT NOT NULL DEFAULT '',
      last_checked TIMESTAMPTZ, last_post_at TIMESTAMPTZ,
      status hoichoi_source_status NOT NULL DEFAULT 'watching',
      posts_today INTEGER NOT NULL DEFAULT 0, health INTEGER NOT NULL DEFAULT 100,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ${T.logs} (
      id SERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      level hoichoi_log_level NOT NULL DEFAULT 'info', stage TEXT NOT NULL, message TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ${T.comments} (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES ${T.articles}(id) ON DELETE CASCADE,
      author TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL, likes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', moderator_note TEXT NOT NULL DEFAULT '',
      reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ${T.reports} (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES ${T.articles}(id) ON DELETE CASCADE,
      reporter_name TEXT NOT NULL, reporter_email TEXT NOT NULL,
      reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS hoichoi_moderation_actions (
      id SERIAL PRIMARY KEY,
      comment_id INTEGER NOT NULL REFERENCES ${T.comments}(id) ON DELETE CASCADE,
      from_status TEXT NOT NULL, to_status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
      actor TEXT NOT NULL DEFAULT 'admin', origin TEXT NOT NULL DEFAULT 'web',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS hoichoi_service_heartbeats (
      service TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'ready',
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function countArticles(): Promise<number> {
  const result = (await raw(`SELECT COUNT(*) AS n FROM ${T.articles}`)) as { rows?: Array<Record<string, unknown>> };
  const value = Array.isArray(result?.rows) ? result.rows[0]?.n : undefined;
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Seeding uses the ORM query builder instead of concatenated SQL: Bangla demo
 * text contains `;` and quotes, which breaks naive statement splitting and
 * manual escaping. Drizzle parameterises every value.
 */
async function seed() {
  const now = Date.now();
  const minAgo = (m: number | null | undefined) => (m == null ? null : new Date(now - m * 60_000));
  const hoursAgo = (h: number | null | undefined) => minAgo(h == null ? null : h * 60);

  await db.insert(tables.articles).values(
    SEED_ARTICLES.map((a) => ({
      title: a.title,
      dek: a.dek,
      body: a.body,
      category: a.category,
      location: a.location,
      sourceName: a.sourceName,
      sourceUrl: "https://facebook.com/hoichoi-demo",
      fbExcerpt: a.fbExcerpt,
      fbAuthor: a.fbAuthor,
      imageUrl: a.imageUrl,
      imageCredit: a.imageCredit,
      hash: a.hash,
      readingMinutes: a.readingMinutes,
      featured: a.featured,
      status: a.status,
      collectedAt: hoursAgo(a.ageH)!,
      publishedAt: hoursAgo(a.pubAgeH),
    })),
  );

  await db.insert(tables.sources).values(
    SEED_SOURCES.map((r) => ({
      name: r[0],
      kind: r[1],
      fbId: r[2],
      handle: r[3],
      topics: r[4],
      lastChecked: minAgo(r[5]),
      lastPostAt: minAgo(r[6]),
      status: r[7],
      postsToday: r[8],
      health: r[9],
      note: r[10],
    })),
  );

  await db.insert(tables.apiKeys).values(
    SEED_KEYS.map((k) => ({
      label: k[0], service: k[1], envName: k[2], maskedValue: k[3],
      revealValue: k[4], scope: k[5], status: k[6], rotatedAt: k[7], note: k[8],
    })),
  );

  await db.insert(tables.pipelineRuns).values(
    SEED_RUNS.map((r) => ({
      startedAt: minAgo(r[0])!, trigger: r[1], status: r[2], collected: r[3],
      duplicates: r[4], published: r[5], durationSec: r[6], note: r[7],
    })),
  );

  await db.insert(tables.collectorLogs).values(
    SEED_LOGS.map((l) => ({ ts: minAgo(l[0])!, level: l[1], stage: l[2], message: l[3] })),
  );

  await db.insert(tables.comments).values(
    SEED_COMMENTS.map((c) => ({
      articleId: c[0], author: c[1], body: c[2], likes: c[3],
      status: "approved" as const, createdAt: minAgo(c[4])!,
    })),
  );

  await db.insert(tables.reports).values(
    SEED_REPORTS.map((r) => ({
      articleId: r[0], reporterName: r[1], reporterEmail: r[2],
      reason: r[3], details: r[4], status: r[5], createdAt: minAgo(r[6])!,
    })),
  );
}

export type BootstrapResult = { ok: true; driver: string; seeded: boolean; articles: number };

export async function bootstrapDatabase(): Promise<BootstrapResult> {
  await createTables();
  // Adds moderation columns to an older hoichoi_comments table if present.
  await migrateModeration();
  const existing = await countArticles();
  if (existing === 0) await seed();
  return { ok: true, driver: DB_DRIVER, seeded: existing === 0, articles: await countArticles() };
}

let readyPromise: Promise<void> | null = null;

/**
 * Idempotent, cached per server instance. Creates our namespaced tables and
 * seeds demo content only when the database has no hoichoi_articles rows.
 * Set HOICHOI_AUTO_BOOTSTRAP=false to require the explicit /api/setup call.
 */
export function ensureReady(): Promise<void> {
  if (process.env.HOICHOI_AUTO_BOOTSTRAP === "false") return Promise.resolve();
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        await countArticles();
      } catch {
        try {
          await bootstrapDatabase();
        } catch (error) {
          console.error("[db] automatic bootstrap failed:", error);
        }
      }
    })();
  }
  return readyPromise;
}

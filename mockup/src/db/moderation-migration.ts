import { db, DB_DRIVER } from "@/db";
import { sql, type SQL } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

/**
 * Additive migration for the namespaced community tables.
 *  • hoichoi_comments      → moderation columns + commenter email
 *  • hoichoi_moderation_actions / hoichoi_service_heartbeats
 *  • hoichoi_reports       → reader reports (used by /api/reports)
 * Existing unreviewed comments become pending — never deleted, never auto-approved.
 */
export async function migrateModeration() {
  const sqlite = db as unknown as LibSQLDatabase;
  const execute = async (query: SQL) => (DB_DRIVER === "turso" ? sqlite.run(query) : db.execute(query));
  const columns =
    DB_DRIVER === "turso"
      ? (await sqlite.all<{ name: string }>(sql`PRAGMA table_info(hoichoi_comments)`)).map((c) => c.name)
      : (
          await db.execute<{ column_name: string }>(
            sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'hoichoi_comments' AND table_schema = 'public'`,
          )
        ).rows.map((c) => c.column_name);

  // Table does not exist yet: createTables() handles it, nothing to migrate.
  if (!columns.length) return { ok: true, driver: DB_DRIVER, migration: "skipped" };

  const timestamp = DB_DRIVER === "turso" ? "INTEGER" : "TIMESTAMPTZ";
  for (const [name, definition] of [
    ["status", "TEXT NOT NULL DEFAULT 'pending'"],
    ["moderator_note", "TEXT NOT NULL DEFAULT ''"],
    ["reviewed_at", timestamp],
    ["email", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!columns.includes(name)) await execute(sql.raw(`ALTER TABLE hoichoi_comments ADD COLUMN ${name} ${definition}`));
  }

  const id = DB_DRIVER === "turso" ? "INTEGER PRIMARY KEY AUTOINCREMENT" : "SERIAL PRIMARY KEY";
  await execute(sql.raw(`CREATE TABLE IF NOT EXISTS hoichoi_moderation_actions (
    id ${id}, comment_id INTEGER NOT NULL REFERENCES hoichoi_comments(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL, to_status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
    actor TEXT NOT NULL DEFAULT 'admin', origin TEXT NOT NULL DEFAULT 'web', created_at ${timestamp} NOT NULL
  )`));
  await execute(sql.raw(`CREATE TABLE IF NOT EXISTS hoichoi_service_heartbeats (
    service TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'ready', last_seen_at ${timestamp} NOT NULL
  )`));
  await execute(sql.raw(`CREATE TABLE IF NOT EXISTS hoichoi_reports (
    id ${id}, article_id INTEGER NOT NULL REFERENCES hoichoi_articles(id) ON DELETE CASCADE,
    reporter_name TEXT NOT NULL, reporter_email TEXT NOT NULL,
    reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open', created_at ${timestamp} NOT NULL
  )`));
  await execute(sql`CREATE INDEX IF NOT EXISTS hoichoi_comments_mod_idx ON hoichoi_comments(status, created_at)`);
  await execute(sql`CREATE INDEX IF NOT EXISTS hoichoi_comments_article_idx ON hoichoi_comments(article_id, status)`);
  await execute(sql`CREATE INDEX IF NOT EXISTS hoichoi_mod_comment_idx ON hoichoi_moderation_actions(comment_id)`);
  await execute(sql`CREATE INDEX IF NOT EXISTS hoichoi_reports_created_idx ON hoichoi_reports(created_at)`);
  await execute(sql`CREATE INDEX IF NOT EXISTS hoichoi_reports_article_idx ON hoichoi_reports(article_id)`);
  return { ok: true, driver: DB_DRIVER, migration: "community-v2" };
}

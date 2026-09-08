import { NextResponse } from "next/server";
import { DB_DRIVER, raw } from "@/db";
import {
  SEED_ARTICLES,
  SEED_SOURCES,
  SEED_KEYS,
  SEED_RUNS,
  SEED_LOGS,
  SEED_COMMENTS,
} from "@/lib/seed-data";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/setup  (header: x-setup-key)
 * One-click bootstrap for ANY deployment (Vercel + Turso [primary], or a
 * local Postgres fallback): creates all tables IF NOT EXISTS, then seeds
 * demo data when the tables are empty. Guarded by SETUP_KEY env var.
 */
export async function GET(req: Request) {
  const setupKey = process.env.SETUP_KEY;
  if (setupKey) {
    if (req.headers.get("x-setup-key") !== setupKey) {
      return NextResponse.json(
        { ok: false, error: "SETUP_KEY mismatch — send header x-setup-key" },
        { status: 401 },
      );
    }
  }

  const ts = (rel: string | null) =>
    DB_DRIVER === "turso"
      ? rel
        ? `(unixepoch('now','${rel}') * 1000)`
        : "NULL"
      : rel
        ? `(NOW() ${rel})`
        : "NULL";

  const s = (v: string) => `'${v.replace(/'/g, "''")}'`;

  // libSQL execute() accepts a single statement — split multi-statement DDL.
  const runAll = async (sqlText: string) => {
    if (DB_DRIVER === "turso") {
      for (const part of sqlText.split(";")) {
        if (part.trim()) await raw(part + ";");
      }
      return;
    }
    await raw(sqlText);
  };

  try {
    /* ---------------- tables ---------------- */
    if (DB_DRIVER === "turso") {
      await runAll(`
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL, dek TEXT NOT NULL, body TEXT NOT NULL,
          category TEXT NOT NULL, location TEXT NOT NULL DEFAULT 'ঢাকা',
          source_name TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '#',
          fb_excerpt TEXT NOT NULL, fb_author TEXT NOT NULL DEFAULT '',
          image_url TEXT NOT NULL, image_credit TEXT NOT NULL DEFAULT '',
          hash TEXT NOT NULL UNIQUE, reading_minutes INTEGER NOT NULL DEFAULT 3,
          featured INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          collected_at INTEGER NOT NULL, published_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL, service TEXT NOT NULL, env_name TEXT NOT NULL,
          masked_value TEXT NOT NULL, reveal_value TEXT NOT NULL,
          scope TEXT NOT NULL DEFAULT 'both', status TEXT NOT NULL DEFAULT 'active',
          rotated_at TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS pipeline_runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL, trigger TEXT NOT NULL DEFAULT 'cron',
          status TEXT NOT NULL DEFAULT 'success', collected INTEGER NOT NULL DEFAULT 0,
          duplicates INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 0,
          duration_sec INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'page', fb_id TEXT NOT NULL,
          handle TEXT NOT NULL DEFAULT '', topics TEXT NOT NULL DEFAULT '',
          last_checked INTEGER, last_post_at INTEGER,
          status TEXT NOT NULL DEFAULT 'watching', posts_today INTEGER NOT NULL DEFAULT 0,
          health INTEGER NOT NULL DEFAULT 100, note TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS collector_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ts INTEGER NOT NULL, level TEXT NOT NULL DEFAULT 'info',
          stage TEXT NOT NULL, message TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
          author TEXT NOT NULL, body TEXT NOT NULL,
          likes INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
        );
      `);
    } else {
      await runAll(`
        DO $$ BEGIN
          CREATE TYPE article_status AS ENUM ('published','pending','duplicate');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN
          CREATE TYPE key_scope AS ENUM ('desktop','web','both');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN
          CREATE TYPE source_kind AS ENUM ('page','group');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN
          CREATE TYPE source_status AS ENUM ('watching','paused','error');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN
          CREATE TYPE log_level AS ENUM ('info','ok','warn','err');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        CREATE TABLE IF NOT EXISTS articles (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL, dek TEXT NOT NULL, body TEXT NOT NULL,
          category TEXT NOT NULL, location TEXT NOT NULL DEFAULT 'ঢাকা',
          source_name TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '#',
          fb_excerpt TEXT NOT NULL, fb_author TEXT NOT NULL DEFAULT '',
          image_url TEXT NOT NULL, image_credit TEXT NOT NULL DEFAULT '',
          hash TEXT NOT NULL UNIQUE, reading_minutes INTEGER NOT NULL DEFAULT 3,
          featured BOOLEAN NOT NULL DEFAULT FALSE, status article_status NOT NULL DEFAULT 'pending',
          collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), published_at TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS api_keys (
          id SERIAL PRIMARY KEY,
          label TEXT NOT NULL, service TEXT NOT NULL, env_name TEXT NOT NULL,
          masked_value TEXT NOT NULL, reveal_value TEXT NOT NULL,
          scope key_scope NOT NULL DEFAULT 'both', status TEXT NOT NULL DEFAULT 'active',
          rotated_at TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS pipeline_runs (
          id SERIAL PRIMARY KEY,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), trigger TEXT NOT NULL DEFAULT 'cron',
          status TEXT NOT NULL DEFAULT 'success', collected INTEGER NOT NULL DEFAULT 0,
          duplicates INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 0,
          duration_sec INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS sources (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL, kind source_kind NOT NULL DEFAULT 'page', fb_id TEXT NOT NULL,
          handle TEXT NOT NULL DEFAULT '', topics TEXT NOT NULL DEFAULT '',
          last_checked TIMESTAMPTZ, last_post_at TIMESTAMPTZ,
          status source_status NOT NULL DEFAULT 'watching', posts_today INTEGER NOT NULL DEFAULT 0,
          health INTEGER NOT NULL DEFAULT 100, note TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS collector_logs (
          id SERIAL PRIMARY KEY,
          ts TIMESTAMPTZ NOT NULL DEFAULT NOW(), level log_level NOT NULL DEFAULT 'info',
          stage TEXT NOT NULL, message TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
          author TEXT NOT NULL, body TEXT NOT NULL,
          likes INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);
      `);
    }

    /* ---------------- seed (only when empty) ---------------- */
    const countRes: unknown = await raw("SELECT COUNT(*) AS n FROM articles");
    let existing = 0;
    try {
      const rows = (countRes as { rows?: Array<{ n: number | string }>; rowsAffected?: number })
        .rows ?? (countRes as { rows?: never });
      const first = Array.isArray(rows) ? rows[0] : null;
      existing = Number(first?.n ?? (countRes as { n?: number }).n ?? 0);
    } catch {
      existing = 0;
    }

    let seeded = false;
    if (existing === 0) {
      const artVals = SEED_ARTICLES.map(
        (a) =>
          `(${s(a.title)}, ${s(a.dek)}, ${s(a.body)}, ${s(a.category)}, ${s(a.location)}, ${s(a.sourceName)}, ${s("https://facebook.com/hoichoi-demo")}, ${s(a.fbExcerpt)}, ${s(a.fbAuthor)}, ${s(a.imageUrl)}, ${s(a.imageCredit)}, ${s(a.hash)}, ${a.readingMinutes}, ${a.featured ? 1 : 0}, ${s(a.status)}, ${ts(`-${a.ageH} hours`)}, ${a.pubAgeH ? ts(`-${a.pubAgeH} hours`) : "NULL"})`,
      ).join(",");
      await raw(
        `INSERT INTO articles (title, dek, body, category, location, source_name, source_url, fb_excerpt, fb_author, image_url, image_credit, hash, reading_minutes, featured, status, collected_at, published_at) VALUES ${artVals};`,
      );

      const srcVals = SEED_SOURCES.map(
        (r) =>
          `(${s(r[0])}, ${s(r[1])}, ${s(r[2])}, ${s(r[3])}, ${s(r[4])}, ${ts(r[5])}, ${ts(r[6])}, ${s(r[7])}, ${r[8]}, ${r[9]}, ${s(r[10])})`,
      ).join(",");
      await raw(
        `INSERT INTO sources (name, kind, fb_id, handle, topics, last_checked, last_post_at, status, posts_today, health, note) VALUES ${srcVals};`,
      );

      const keyVals = SEED_KEYS.map(
        (k) =>
          `(${s(k[0])}, ${s(k[1])}, ${s(k[2])}, ${s(k[3])}, ${s(k[4])}, ${s(k[5])}, ${s(k[6])}, ${s(k[7])}, ${s(k[8])})`,
      ).join(",");
      await raw(
        `INSERT INTO api_keys (label, service, env_name, masked_value, reveal_value, scope, status, rotated_at, note) VALUES ${keyVals};`,
      );

      const runVals = SEED_RUNS.map(
        (r) =>
          `(${ts(r[0])}, ${s(r[1])}, ${s(r[2])}, ${r[3]}, ${r[4]}, ${r[5]}, ${r[6]}, ${s(r[7])})`,
      ).join(",");
      await raw(
        `INSERT INTO pipeline_runs (started_at, trigger, status, collected, duplicates, published, duration_sec, note) VALUES ${runVals};`,
      );

      const logVals = SEED_LOGS.map(
        (l) => `(${ts(l[0])}, ${s(l[1])}, ${s(l[2])}, ${s(l[3])})`,
      ).join(",");
      await raw(
        `INSERT INTO collector_logs (ts, level, stage, message) VALUES ${logVals};`,
      );

      const cmtVals = SEED_COMMENTS.map(
        (c) =>
          `(${c[0]}, ${s(c[1])}, ${s(c[2])}, ${c[3]}, ${ts(c[4])})`,
      ).join(",");
      await raw(
        `INSERT INTO comments (article_id, author, body, likes, created_at) VALUES ${cmtVals};`,
      );

      seeded = true;
    }

    return NextResponse.json({
      ok: true,
      driver: DB_DRIVER,
      seeded,
      note: seeded
        ? "টেবিল তৈরি + ডেমো ডেটা সিড হয়েছে"
        : "টেবিল বিদ্যমান; ডেটা থাকায় সিড করা হয়নি",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, driver: DB_DRIVER, error: e instanceof Error ? e.message : "setup failed" },
      { status: 500 },
    );
  }
}

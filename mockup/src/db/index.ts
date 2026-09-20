import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { mkdirSync } from "node:fs";
import { createClient, type Client as TursoClient } from "@libsql/client";
import { drizzle as drizzleTurso } from "drizzle-orm/libsql";
import * as pgSchema from "./schema";
import * as tursoSchema from "./schema-turso";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * Driver-aware database bootstrap — TURSO IS PRIMARY.
 *
 *  • DB_DRIVER=turso (default) → Turso/libSQL via @libsql/client
 *      TURSO_DATABASE_URL = libsql://YOUR-DB.turso.io   (cloud / Vercel)
 *                         = file:./data/hoichoi.db      (local dev)
 *  • DB_DRIVER=postgres        → Postgres (local sandbox / Neon) fallback
 *
 * Why the casts below?
 *   Both schemas (schema.ts / schema-turso.ts) are field-for-field identical,
 *   so the app types everything against the Postgres schema ONCE, while the
 *   runtime binds the correct dialect + the correct table objects for the
 *   active driver. Each drizzle instance is built with ITS OWN schema — we
 *   never feed pg tables into the SQLite dialect.
 *
 * This module NEVER throws on missing credentials: the app boots in
 * "demo fallback" mode (queries return empty, pages still render). That is
 * what keeps a fresh Vercel deploy alive before env vars are set.
 * ─────────────────────────────────────────────────────────────────────────
 */

const rawDriver = (process.env.DB_DRIVER ?? "").trim().toLowerCase();
export const DB_DRIVER: "turso" | "postgres" = rawDriver === "postgres" ? "postgres" : "turso";
if (rawDriver && rawDriver !== "postgres" && rawDriver !== "turso") {
  // e.g. DB_DRIVER="hoichoi" — not a driver name, so we keep the Turso default.
  console.warn(`[db] Unknown DB_DRIVER="${process.env.DB_DRIVER}" — using "turso". Use "turso" or "postgres".`);
}

/** Honest label — the driver actually in use (never a vendor guess). */
export const DRIVER_LABEL = DB_DRIVER === "turso" ? "TURSO" : "POSTGRES";

type GlobalForDb = typeof globalThis & {
  __hcPgPool?: Pool;
  __hcTursoClient?: TursoClient;
};

const globalForDb = globalThis as GlobalForDb;

/* ---------------------------------------------------------------- clients */

let pool: Pool | null = null;
let tursoClient: TursoClient | null = null;

if (DB_DRIVER === "turso") {
  const url =
    process.env.TURSO_DATABASE_URL ??
    (process.env.VERCEL ? undefined : "file:./data/hoichoi.db");

  if (url) {
    // local file mode: make sure the directory exists before libSQL opens it
    if (url.startsWith("file:")) {
      try {
        const p = url.slice(5);
        const dir = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) || "." : ".";
        mkdirSync(dir, { recursive: true });
      } catch {
        /* read-only FS (serverless) — cloud deploys use libsql:// URLs */
      }
    }
    tursoClient =
      globalForDb.__hcTursoClient ??
      createClient({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
        // optional embedded replica: local cache of the cloud DB (offline desk)
        syncUrl: process.env.TURSO_SYNC_URL,
        syncInterval: process.env.TURSO_SYNC_INTERVAL
          ? Number(process.env.TURSO_SYNC_INTERVAL)
          : undefined,
      });
    if (process.env.NODE_ENV !== "production") globalForDb.__hcTursoClient = tursoClient;
    console.log(`[db] driver=turso url=${url.replace(/:\/\/[^@]*@/, "://***@")}`);
  } else {
    console.warn("[db] TURSO_DATABASE_URL missing — demo fallback mode.");
  }
} else {
  const url = process.env.DATABASE_URL;
  if (!url) console.warn("[db] DATABASE_URL missing — demo fallback mode.");
  pool =
    globalForDb.__hcPgPool ??
    new Pool({
      connectionString: url ?? "postgresql://demo:demo@127.0.0.1:5432/demo",
      max: 4,
    });
  if (process.env.NODE_ENV !== "production") globalForDb.__hcPgPool = pool;
  console.log(`[db] driver=postgres ${url ? "" : "(placeholder url)"}`);
}

/* ------------------------------------------------- drizzle + active schema */

type PgDb = NodePgDatabase<typeof pgSchema>;

const tursoDb =
  tursoClient ? drizzleTurso(tursoClient, { schema: tursoSchema }) : null;
const pgDb = pool ? drizzlePg(pool, { schema: pgSchema }) : null;

/**
 * The one db object the app uses. Typed as the Postgres-flavoured db so all
 * call sites keep a single stable type; at runtime it is the correct dialect.
 * `{}` fallback = demo mode (queries throw → caught → empty results).
 */
export const db = ((DB_DRIVER === "turso" ? tursoDb : pgDb) ?? {}) as PgDb;

/**
 * Table objects for the ACTIVE driver (sqlite tables on Turso, pg tables on
 * Postgres). Structurally identical, so typed once against the pg schema.
 */
export const tables = (
  DB_DRIVER === "turso" ? tursoSchema : pgSchema
) as unknown as typeof pgSchema;

/** True when a real connection is configured (vs. demo fallback). */
export const DB_CONFIGURED = DB_DRIVER === "turso" ? !!tursoClient : !!pool;

/* ------------------------------------------------------------- utilities */

/**
 * Raw SQL — used by /api/setup (DDL + seed). Note: libSQL's execute() runs a
 * single statement, so callers split multi-statement DDL (see runAll there).
 */
export async function raw(sqlText: string): Promise<unknown> {
  if (DB_DRIVER === "turso") {
    if (!tursoClient) throw new Error("Turso client not configured");
    return tursoClient.execute(sqlText);
  }
  if (!pool) throw new Error("Postgres pool not configured");
  return pool.query(sqlText);
}

/**
 * Connectivity probe for /api/health. Uses the UNDERLYING client (not drizzle)
 * because the two adapters expose different method sets — and it must not
 * depend on any table existing, so a fresh deploy still reports healthy.
 */
export async function ping(): Promise<{ ok: boolean; driver: string }> {
  try {
    if (DB_DRIVER === "turso") {
      if (!tursoClient) return { ok: false, driver: DRIVER_LABEL };
      await tursoClient.execute("SELECT 1");
    } else {
      if (!pool) return { ok: false, driver: DRIVER_LABEL };
      await pool.query("SELECT 1");
    }
    return { ok: true, driver: DRIVER_LABEL };
  } catch {
    return { ok: false, driver: DRIVER_LABEL };
  }
}

export { pool as pgPool, tursoClient };

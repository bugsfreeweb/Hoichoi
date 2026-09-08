import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createClient, type Client as TursoClient } from "@libsql/client";
import { drizzle as drizzleTurso } from "drizzle-orm/libsql";
import * as pgSchema from "./schema";
import * as tursoSchema from "./schema-turso";

/**
 * Dual-driver bootstrap — TURSO IS THE PRIMARY DATABASE.
 *  - DB_DRIVER=turso    →  Turso (libSQL)   [default · production]
 *  - DB_DRIVER=postgres →  plain Postgres   [local sandbox fallback only]
 *
 * Selection rule:
 *  1. Explicit DB_DRIVER wins.
 *  2. Otherwise, if a TURSO_DATABASE_URL exists → turso.
 *  3. Otherwise, if only DATABASE_URL exists → postgres (sandbox).
 *  4. Otherwise → turso (demo fallback; app still renders).
 *
 * IMPORTANT: this module NEVER throws when a connection string is missing.
 * The app boots in "demo fallback" mode (queries return empty arrays, pages
 * still render) — that is exactly what keeps a fresh Vercel deploy alive.
 */

function resolveDriver(): "turso" | "postgres" {
  const explicit = (process.env.DB_DRIVER ?? "").toLowerCase();
  if (explicit === "turso") return "turso";
  if (explicit === "postgres") return "postgres";
  if (process.env.TURSO_DATABASE_URL) return "turso";
  if (process.env.DATABASE_URL) return "postgres";
  return "turso";
}

export const DB_DRIVER: "turso" | "postgres" = resolveDriver();

export const DRIVER_LABEL = DB_DRIVER === "turso" ? "TURSO" : "POSTGRES";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __hcTursoClient?: TursoClient;
};

let pool: Pool | null = null;
let tursoClient: TursoClient | null = null;

if (DB_DRIVER === "turso") {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    tursoClient =
      globalForDb.__hcTursoClient ??
      createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__hcTursoClient = tursoClient;
    }
  } else {
    console.warn(
      "[db] TURSO_DATABASE_URL not set — running in demo fallback mode.",
    );
  }
} else {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[db] DATABASE_URL not set — running in demo fallback mode. Pages still render.",
    );
  }
  pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: url ?? "postgresql://demo:demo@127.0.0.1:5432/demo",
      max: 4,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
}

export const db = (
  DB_DRIVER === "turso" && tursoClient
    ? (drizzleTurso(tursoClient, { schema: tursoSchema }) as unknown as NodePgDatabase<
        typeof pgSchema
      >)
    : pool
      ? (drizzlePg(pool, { schema: pgSchema }) as NodePgDatabase<typeof pgSchema>)
      : null
) ?? ({} as NodePgDatabase<typeof pgSchema>);

/** Raw SQL executor — used by /api/setup (create tables + seed) and maintenance. */
export async function raw(sqlText: string): Promise<unknown> {
  if (DB_DRIVER === "turso") {
    if (!tursoClient) throw new Error("Turso client not configured");
    return tursoClient.execute(sqlText);
  }
  if (!pool) throw new Error("Postgres pool not configured");
  return pool.query(sqlText);
}

export { pool as pgPool };

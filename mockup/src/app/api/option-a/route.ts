import { NextResponse } from "next/server";
import { DB_DRIVER, DRIVER_LABEL } from "@/db";
import {
  getArticles,
  getRuns,
  getKeys,
  getSources,
  getLogs,
  lite,
  runLite,
  sourceLite,
  logLite,
} from "@/lib/data";

/**
 * JSON feed for the pure HTML/CSS/JS build of Option-A.
 * The static files in /public (option-a.html/.css/.js) fetch this endpoint
 * so the framework-free desktop mockup still shows LIVE Postgres data.
 */
export async function GET() {
  const [articles, runs, keys, sources, logs] = await Promise.all([
    getArticles(),
    getRuns(),
    getKeys(),
    getSources(),
    getLogs(),
  ]);

  return NextResponse.json({
    ok: true,
    source: "database",
    driver: DB_DRIVER,
    driverLabel: DRIVER_LABEL,
    generatedAt: new Date().toISOString(),
    articles: articles.map(lite),
    runs: runs.map(runLite),
    keys,
    sources: sources.map(sourceLite),
    logs: logs.map(logLite),
  });
}

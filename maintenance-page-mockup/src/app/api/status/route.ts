import { NextResponse } from "next/server";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Public status feed — mirrors the real front page contract (GET /api/stats · 10s).
 * Safe to expose: no secrets, no PII. Used by maintenance templates for the
 * live Turso / API / collector dots and the stat quartet.
 */
export async function GET() {
  const s = await getSettings();
  return NextResponse.json(
    {
      mode: s.mode,
      theme: s.activeTheme,
      target: s.countdown.target,
      progress: s.progress.enabled ? s.progress.value : null,
      turso: s.hoichoi.turso,
      api: s.hoichoi.api,
      collector: s.hoichoi.collector,
      stats: s.hoichoi.stats,
      lastRun: s.hoichoi.lastRun,
      locale: s.ui.language,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "public, max-age=10, stale-while-revalidate=30",
      },
    },
  );
}

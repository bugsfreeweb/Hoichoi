import { NextRequest, NextResponse } from "next/server";
import { analyticsSnapshot } from "@hoichoi/db";
import type { AnalyticsRange } from "@hoichoi/shared-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats?range=24h|7d|all
 * Public — live "newsroom in numbers" snapshot for the home live graph.
 * No caching: recomputed from the database on every call.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("range") ?? "all";
  const range: AnalyticsRange =
    raw === "24h" || raw === "7d" || raw === "all" ? raw : "all";
  try {
    const snapshot = await analyticsSnapshot(range);
    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "পরিসংখ্যান পাওয়া যায়নি।",
      },
      { status: 500 },
    );
  }
}
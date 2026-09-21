import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, unauthorized } from "@/lib/auth";
import { recentPipelineRuns } from "@hoichoi/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/runs?limit=10
 * Admin/editor — recent pipeline runs, used by the dashboard's manual-run
 * progress poller (the runner writes a `running` row on start and a terminal
 * `completed`/`failed` row when done).
 */
export async function GET(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();

  const raw = new URL(req.url).searchParams.get("limit");
  const limit = Math.min(50, Math.max(1, Number(raw) || 10));
  try {
    const runs = await recentPipelineRuns(limit);
    return NextResponse.json({ ok: true, runs });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "রান ইতিহাস পাওয়া যায়নি।" },
      { status: 500 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, unauthorized } from "@/lib/auth";
import { buildAdminDashboard } from "@/lib/admin-dashboard";
import type { DashRange } from "@hoichoi/dash";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard?range=24h|7d|all
 * Admin/editor — the same snapshot the console page renders server-side, exposed
 * as JSON so the client can live-refresh and poll without a full navigation.
 */
export async function GET(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();

  const raw = new URL(req.url).searchParams.get("range");
  const range: DashRange = raw === "24h" || raw === "7d" ? raw : "all";
  try {
    const { model } = await buildAdminDashboard(range);
    return NextResponse.json({ ok: true, model });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "স্ন্যাপশট পাওয়া যায়নি।" },
      { status: 500 },
    );
  }
}

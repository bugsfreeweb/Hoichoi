import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, unauthorized } from "@/lib/auth";
import { trafficSnapshot } from "@hoichoi/db";
import type { TrafficRange } from "@hoichoi/shared-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/traffic?range=24h|7d|30d
 * Admin/editor — the five first-party analytics groups (online visitors,
 * most-read content, comments, page-view/OS/browser mix, ad views).
 */
export async function GET(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();

  const raw = new URL(req.url).searchParams.get("range");
  const range: TrafficRange = raw === "7d" || raw === "30d" ? raw : "24h";
  try {
    const snapshot = await trafficSnapshot(range);
    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "ট্রাফিক স্ন্যাপশট পাওয়া যায়নি।" },
      { status: 500 },
    );
  }
}

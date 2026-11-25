import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { securityAlerts } from "@/lib/github-alerts";

export const dynamic = "force-dynamic";

/** Open code-scanning alerts for the console's security panel and the bell. */
export async function GET(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const data = await securityAlerts({ refresh });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

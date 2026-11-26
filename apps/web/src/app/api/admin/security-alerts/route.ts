import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  DISMISS_REASONS,
  dismissCodeAlert,
  securityAlerts,
  type DismissReason,
} from "@/lib/github-alerts";

export const dynamic = "force-dynamic";

/** Open code-scanning alerts for the console's security panel and the bell. */
export async function GET(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const data = await securityAlerts({ refresh });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

/**
 * Dismiss one alert on GitHub with a reason. The panel is the operator's
 * surface; sending them to github.com for a three-field form was the remaining
 * gap between "see the alert" and "act on it".
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { number?: unknown; reason?: unknown; comment?: unknown }
    | null;
  const number = Number(body?.number);
  const reason = String(body?.reason ?? "") as DismissReason;
  if (!Number.isInteger(number) || number <= 0) {
    return NextResponse.json({ error: "number must be a positive integer" }, { status: 400 });
  }
  if (!DISMISS_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${DISMISS_REASONS.join(", ")}` },
      { status: 400 },
    );
  }
  const comment =
    typeof body?.comment === "string" ? body.comment.trim().slice(0, 280) : "";

  const result = await dismissCodeAlert({ number, reason, comment });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "dismiss failed" },
      { status: 502 },
    );
  }

  await audit(
    user,
    {
      action: "security.alert_dismiss",
      entityType: "code_scanning_alert",
      entityId: number,
      summary: `কোড-স্ক্যানিং অ্যালার্ট #${number} GitHub-এ dismiss করা হয়েছে`,
      metadata: { number, reason, hasComment: Boolean(comment) },
    },
    req,
  );

  return NextResponse.json({ ok: true, number, reason });
}

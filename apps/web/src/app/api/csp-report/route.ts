import { NextResponse } from "next/server";
import { formatReports, parseReports, MAX_REPORT_BYTES } from "@/lib/csp-report";
import { limitRequest, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CSP violation collector.
 *
 * Public by necessity — the browser posts from any page a reader is on. It is
 * therefore rate-limited, size-capped, parses defensively and always answers 204:
 * the reporter must never see an error, or it will retry and amplify a flood.
 *
 * Reports only reach the platform log. Nothing is stored: a violation contains
 * the reader's island of origin as `document-uri`, and a policy that writes that
 * to the database would be a tracking channel wearing a security badge.
 */
export async function POST(req: Request) {
  const limited = await limitRequest(req, LIMITS.cspReport);
  if (limited) return limited;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_REPORT_BYTES) return new NextResponse(null, { status: 204 });

  const raw = await req.text().catch(() => "");
  const reports = parseReports(req.headers.get("content-type") ?? "", raw);
  for (const line of formatReports(reports)) console.warn(line);

  return new NextResponse(null, { status: 204 });
}

/** Anything but POST is a client bug; say so instead of pretending to accept it. */
export function GET() {
  return NextResponse.json({ ok: false, error: "POST only" }, { status: 405 });
}

import { NextResponse, type NextRequest } from "next/server";
import { csrfVerdict } from "@/lib/csrf";

/**
 * One gate for every state-changing request that rides an ambient cookie.
 *
 * Applying this centrally beats wiring `assertSameOrigin` into forty handlers:
 * a route added tomorrow is covered the day it is written, which is the only
 * version of this check that stays true. See `lib/csrf.ts` for the rule.
 */
export function middleware(req: NextRequest): NextResponse {
  const cookie = req.headers.get("cookie") ?? "";
  const verdict = csrfVerdict({
    method: req.method,
    origin: req.headers.get("origin"),
    fetchSite: req.headers.get("sec-fetch-site"),
    host: req.headers.get("host"),
    forwardedHost: req.headers.get("x-forwarded-host"),
    forwardedProto: req.headers.get("x-forwarded-proto"),
    hasSessionCookie: cookie.trim().length > 0,
    allowed: (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  });
  if (verdict.ok) return NextResponse.next();
  return NextResponse.json(
    { error: "cross-site request refused", code: "csrf" },
    { status: 403, headers: { "x-csrf-reason": verdict.reason } },
  );
}

/**
 * API routes and the two consoles. The public site is left alone: it only
 * reads, and a caching layer in front of a GET should not be paying for this.
 */
export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/portal/:path*"],
};
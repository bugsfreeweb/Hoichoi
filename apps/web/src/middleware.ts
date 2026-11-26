import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@hoichoi/i18n";
import { csrfVerdict } from "@/lib/csrf";

/**
 * One gate for every state-changing request that rides an ambient cookie.
 *
 * Applying this centrally beats wiring `assertSameOrigin` into forty handlers:
 * a route added tomorrow is covered the day it is written, which is the only
 * version of this check that stays true. See `lib/csrf.ts` for the rule.
 */
export function middleware(req: NextRequest): NextResponse {
  // A shared link carries its language. The root layout cannot see a query
  // string, so `?lang=en` is turned into the same cookie the toggle writes;
  // without this the parameter was documented but silently ignored.
  const wanted = req.nextUrl.searchParams.get("lang");
  const lang = wanted === "en" || wanted === "bn" ? wanted : null;
  if (lang) req.cookies.set(LOCALE_COOKIE, lang);

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
  if (verdict.ok) {
    const res = NextResponse.next({ request: { headers: req.headers } });
    if (lang) {
      res.cookies.set({
        name: LOCALE_COOKIE,
        value: lang,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return res;
  }
  return NextResponse.json(
    { error: "cross-site request refused", code: "csrf" },
    { status: 403, headers: { "x-csrf-reason": verdict.reason } },
  );
}

/**
 * Every page that can show chrome, plus the state-changing API. Static files are
 * excluded: a font or image request has no language and no cookie to gate.
 */
export const config = {
  matcher: ["/((?!_next/|fonts/|.*\\..*).*)"],
};
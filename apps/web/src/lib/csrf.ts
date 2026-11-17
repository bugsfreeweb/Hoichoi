/**
 * CSRF guard for cookie-authenticated API routes.
 *
 * The session cookie is `SameSite=Lax`, which already stops a cross-site `POST`
 * from carrying it. That is one browser's promise, not a fact about our server:
 * an embedded webview, a same-site sibling origin, or a proxy that rewrites
 * cookie attributes can quietly break it. Since every state-changing route here
 * trusts an ambient cookie, the request also has to prove where it came from.
 *
 * Rules:
 * - `GET`/`HEAD`/`OPTIONS` are not state-changing and are left alone.
 * - A browser sends `Origin` on every non-simple request; when it is present it
 *   must match the request's own host (or an explicitly allowed origin).
 * - When `Origin` is absent (some native fetch stacks, curl), `Sec-Fetch-Site`
 *   decides: `same-origin`/`none` passes, `cross-site` and `same-site` do not.
 * - A request with neither header is allowed only when it carries no session
 *   cookie at all — i.e. it cannot be riding an ambient credential.
 *
 * Bearer-token callers (the desk) send no cookie, so they are unaffected.
 */
import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Extra origins an operator may need (preview URLs), comma separated. */
function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function siteOrigins(req: Request): string[] {
  const out: string[] = [];
  const host = req.headers.get("host");
  if (host) {
    out.push(`https://${host}`, `http://${host}`);
    // Behind a proxy the public host travels in x-forwarded-host.
  }
  const forwarded = req.headers.get("x-forwarded-host");
  if (forwarded) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    out.push(`${proto}://${forwarded.split(",")[0]?.trim()}`);
  }
  return out;
}

export type CsrfVerdict = { ok: true } | { ok: false; reason: string };

/** Pure decision, so the rule can be tested without a server. */
export function csrfVerdict(input: {
  method: string;
  origin: string | null;
  fetchSite: string | null;
  host: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  hasSessionCookie: boolean;
  allowed?: string[];
}): CsrfVerdict {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return { ok: true };
  // No ambient credential → nothing to forge with.
  if (!input.hasSessionCookie) return { ok: true };

  const allowed = input.allowed ?? [];
  const origins = [
    ...(input.host ? [`https://${input.host}`, `http://${input.host}`] : []),
    ...(input.forwardedHost
      ? [`${input.forwardedProto ?? "https"}://${String(input.forwardedHost).split(",")[0]?.trim()}`]
      : []),
    ...allowed,
  ];

  if (input.origin) {
    const normalized = input.origin.replace(/\/+$/, "");
    // `Origin: null` is what a sandboxed iframe or a file:// page sends.
    if (normalized === "null") return { ok: false, reason: "origin-null" };
    return origins.includes(normalized) ? { ok: true } : { ok: false, reason: "origin-mismatch" };
  }

  if (input.fetchSite) {
    return input.fetchSite === "same-origin" || input.fetchSite === "none"
      ? { ok: true }
      : { ok: false, reason: `fetch-site-${input.fetchSite}` };
  }

  // Neither header, but a cookie is present: refuse rather than guess.
  return { ok: false, reason: "no-origin-header" };
}

/** Route-level check: returns a 403 response, or null when the request is fine. */
export function assertSameOrigin(req: Request): NextResponse | null {
  const cookie = req.headers.get("cookie") ?? "";
  const verdict = csrfVerdict({
    method: req.method,
    origin: req.headers.get("origin"),
    fetchSite: req.headers.get("sec-fetch-site"),
    host: req.headers.get("host"),
    forwardedHost: req.headers.get("x-forwarded-host"),
    forwardedProto: req.headers.get("x-forwarded-proto"),
    hasSessionCookie: /(?:^|;\s*)(?:hoichoi_session|hoichoi_admin|session)=/.test(cookie) || cookie.trim().length > 0,
    allowed: allowedOrigins(),
  });
  if (verdict.ok) return null;
  // The reason is deliberately coarse in the body: a precise answer helps an
  // attacker calibrate, and nobody legitimately needs it.
  return NextResponse.json(
    { error: "cross-site request refused", code: "csrf" },
    { status: 403, headers: { "x-csrf-reason": verdict.reason } },
  );
}
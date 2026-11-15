import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hitRateLimit } from "@hoichoi/db";

/**
 * Public-endpoint throttling.
 *
 * The rules live in one place so an endpoint cannot quietly lose its limit: each
 * route calls `limitRequest()` first and returns its response if it is non-null.
 * Keys are hashed, so the `rate_limits` table never holds a raw IP address.
 */

export interface LimitSpec {
  /** Stable name, e.g. "login-ip". Used as the bucket prefix. */
  name: string;
  limit: number;
  windowMs: number;
  /** Extra discriminator (an email, a post id) to split one client's budget. */
  discriminator?: string;
}

/** Best-effort client identity: CDN headers first, then the socket address. */
function clientIp(req: Request): string {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || h.get("cf-connecting-ip")?.trim() || "unknown";
}

/** sha256 of the identity, truncated — enough to separate buckets, not to recover the IP. */
export function bucketFor(spec: LimitSpec, req: Request): string {
  const ip = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 24);
  const extra = spec.discriminator
    ? ":" + createHash("sha256").update(spec.discriminator.trim().toLowerCase()).digest("hex").slice(0, 24)
    : "";
  return `${spec.name}:${ip}${extra}`;
}

/** 429 with the retry hint a browser and our own UI can both read. */
export function tooMany(retryAfterMs: number): NextResponse {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    {
      ok: false,
      error: "অনেক বেশি অনুরোধ — কিছুক্ষণ পরে আবার চেষ্টা করুন। (Too many requests, try again shortly.)",
      retryAfterSeconds: seconds,
    },
    { status: 429, headers: { "retry-after": String(seconds) } },
  );
}

/**
 * Consume one hit. Returns a 429 response when the budget is gone, otherwise null.
 * Fails **open** on an infrastructure error: a broken counter table must not take
 * the whole site down, and the endpoints guarded here are still authenticated,
 * validated and (for login) code-gated.
 */
export async function limitRequest(req: Request, spec: LimitSpec): Promise<NextResponse | null> {
  try {
    const result = await hitRateLimit({
      key: bucketFor(spec, req),
      limit: spec.limit,
      windowMs: spec.windowMs,
    });
    return result.allowed ? null : tooMany(result.retryAfterMs);
  } catch {
    return null;
  }
}

/** The budgets, named, so tests and routes agree on them. */
export const LIMITS = {
  loginIp: { name: "login-ip", limit: 10, windowMs: 10 * 60_000 },
  loginAccount: { name: "login-account", limit: 5, windowMs: 10 * 60_000 },
  comment: { name: "comment", limit: 8, windowMs: 10 * 60_000 },
  report: { name: "report", limit: 5, windowMs: 60 * 60_000 },
  submission: { name: "submission", limit: 3, windowMs: 60 * 60_000 },
  pollVote: { name: "poll-vote", limit: 12, windowMs: 60_000 },
  track: { name: "track", limit: 120, windowMs: 60_000 },
  adEvent: { name: "ad-event", limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, { name: string; limit: number; windowMs: number }>;

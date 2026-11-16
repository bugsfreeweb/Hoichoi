import { cookies } from "next/headers";
import { newGuestId } from "@hoichoi/db";

/**
 * Guest cookie plumbing for public forms.
 *
 * A reader who comments or reports needs to be recognisable to moderation
 * without being identified. This cookie carries an opaque random id — no email,
 * no fingerprint — and is the only handle the DB stores for guest matching.
 *
 * It lives a year and is intentionally httpOnly: it is an anti-abuse and
 * data-subject key, not something any client script should read or set.
 */

export const GUEST_COOKIE = "hoichoi_guest";
const MAX_AGE_S = 365 * 24 * 60 * 60;

export async function guestIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(GUEST_COOKIE)?.value ?? "";
  if (value.length >= 16 && value.length <= 80 && /^[A-Za-z0-9_-]+$/.test(value)) return value;
  return null;
}

/**
 * Read the guest id, minting one when absent. The cookie is set on the response
 * of the same request that creates the row, so the *next* submission from this
 * reader is already linked.
 */
export async function ensureGuestId(): Promise<string> {
  const existing = await guestIdFromCookies();
  if (existing) return existing;
  const fresh = newGuestId();
  try {
    const jar = await cookies();
    jar.set(GUEST_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_S,
    });
  } catch {
    // Route handlers may run where cookies cannot be mutated (e.g. a cached
    // render). The row still gets an id for this request; the next one re-mints.
  }
  return fresh;
}

/** Best-effort client IP, from the header the platform sets. */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return req.headers.get("x-real-ip")?.trim() || null;
}

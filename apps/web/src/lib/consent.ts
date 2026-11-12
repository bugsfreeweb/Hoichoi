"use client";

/**
 * Reader consent for cookies, analytics and advertising.
 *
 * The site is cookie-less by design (no third-party ad cookies, no cross-site
 * profiling), but it still writes a first-party analytics beacon and advertisers
 * expect a policy statement, so a standard banner is required:
 *
 *  - `essential` — always on: admin/advertiser session cookies, the consent
 *    choice itself. Without these the console cannot work.
 *  - `analytics` — the first-party `/api/track` beacon.
 *  - `ads` — PlatformAdSlot view/click measurement and any embedded ad creative.
 *
 * The choice is stored in localStorage *and* in a cookie (so the server can
 * honour it on the next SSR pass), carrying a version so a policy change can
 * ask again instead of silently reusing an old answer.
 */

export type ConsentLevel = "all" | "essential";

const KEY = "hc-consent";
const COOKIE = "hc_consent";
/** Bump when the policy changes materially. */
export const CONSENT_VERSION = 1;

export interface ConsentRecord {
  level: ConsentLevel;
  version: number;
  at: string;
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (parsed.level !== "all" && parsed.level !== "essential") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(level: ConsentLevel): ConsentRecord {
  const rec: ConsentRecord = { level, version: CONSENT_VERSION, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
    // 6 months; SameSite=Lax so it is readable on normal navigations only.
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `${COOKIE}=${level}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } catch {
    /* private mode: the banner simply reappears next visit */
  }
  return rec;
}

/** True when the visitor allowed analytics/ads measurement. */
export function allowsMeasurement(): boolean {
  const rec = readConsent();
  return rec?.level === "all";
}

/**
 * Server-side read of the consent cookie (no client JS needed).
 * Used to skip the beacon and ad measurement during SSR-driven rendering.
 */
export function consentFromCookie(cookieValue: string | undefined): ConsentLevel | "unset" {
  if (cookieValue === "all") return "all";
  if (cookieValue === "essential") return "essential";
  return "unset";
}

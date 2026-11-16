/**
 * Desk session grants, client side.
 *
 * The app no longer stores a database credential. It stores a device token
 * (`hdc_…`, created in the admin console → নিরাপত্তা → ডেস্কটপ ডিভাইস) and asks
 * the server for a short-lived grant when it needs to talk to the database.
 *
 * The grant lives in memory only, is refreshed a few minutes before it expires,
 * and a 401 is turned into a message that tells the operator exactly what to do
 * (the device was revoked — get a new token). Nothing is written to disk: a
 * stolen laptop no longer carries the keys, which is the whole point.
 */

export interface DeskGrant {
  url: string;
  token: string | null;
  expiresAt: string;
}

interface CacheEntry {
  key: string;
  grant: DeskGrant;
}

let cache: CacheEntry | null = null;

/** Refresh this long before the server's expiry so a call never races it. */
const REFRESH_MARGIN_MS = 5 * 60_000;

export class DeskGrantError extends Error {
  readonly code: "revoked" | "unknown" | "network" | "unconfigured";

  constructor(message: string, code: DeskGrantError["code"]) {
    super(message);
    this.name = "DeskGrantError";
    this.code = code;
  }
}

function normalizeBase(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

/** Drop the cached grant (called after the token changes in Settings). */
export function clearDeskGrant(): void {
  cache = null;
}

export function hasDeskGrant(): boolean {
  return cache !== null && Date.parse(cache.grant.expiresAt) - REFRESH_MARGIN_MS > Date.now();
}

/**
 * Fetch (or reuse) a grant for this device.
 *
 * `baseUrl` is the site origin (e.g. `https://hoichoifeed.vercel.app`). A grant
 * is cached per base+token pair so repeated desk calls in one screen do not
 * hammer the server.
 */
export async function fetchDeskGrant(baseUrl: string, deviceToken: string): Promise<DeskGrant> {
  const base = normalizeBase(baseUrl);
  const token = deviceToken.trim();
  if (!base) throw new DeskGrantError("সাইটের ঠিকানা (Base URL) সেট করুন।", "unconfigured");
  if (!token) throw new DeskGrantError("ডেস্ক টোকেন সেট করুন।", "unconfigured");

  const key = `${base}|${token}`;
  if (cache && cache.key === key) {
    const expires = Date.parse(cache.grant.expiresAt);
    if (Number.isFinite(expires) && expires - REFRESH_MARGIN_MS > Date.now()) return cache.grant;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/desk/session`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    });
  } catch {
    throw new DeskGrantError("সার্ভারে পৌঁছানো যায়নি — ইন্টারনেট বা সাইটের ঠিকানা দেখুন।", "network");
  }

  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; grant?: DeskGrant; error?: string; code?: string }
    | null;

  if (!res.ok || !json?.ok || !json.grant) {
    const code = json?.code === "revoked" ? "revoked" : res.status === 401 ? "unknown" : "network";
    throw new DeskGrantError(json?.error ?? `সেশন অনুমতি পাওয়া যায়নি (${res.status})।`, code);
  }

  cache = { key, grant: json.grant };
  return json.grant;
}

/** Grant → runner env. Kept tiny so the vault can overlay it with one call. */
export function grantToEnv(grant: DeskGrant): Record<string, string> {
  const env: Record<string, string> = { TURSO_DATABASE_URL: grant.url, HOICHOI_DESK_GRANTED: "1" };
  if (grant.token) env.TURSO_AUTH_TOKEN = grant.token;
  return env;
}
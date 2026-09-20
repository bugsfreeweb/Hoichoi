import { createHmac, timingSafeEqual } from "node:crypto";
import type { AdminSession } from "./moderation-types";

export const ADMIN_COOKIE = "hoichoi_moderator";
export const SESSION_SECONDS = 8 * 60 * 60;
const MIN_SECRET_LENGTH = 24;

export function secretMatches(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

/** Treats "", "0", "false", "off", "no" as disabled; any other value as enabled. */
function truthy(value: string | undefined) {
  const v = (value ?? "").trim().toLowerCase();
  return v !== "" && !["0", "false", "off", "no"].includes(v);
}

export function demoRequested() {
  return truthy(process.env.DEMO_MODE);
}

export function adminMode(): AdminSession["mode"] {
  // A real protection key always wins, but it must be long enough to matter.
  if ((process.env.ADMIN_SECRET ?? "").length >= MIN_SECRET_LENGTH) return "protected";
  console.warn(
    `[admin] ADMIN_SECRET missing or shorter than ${MIN_SECRET_LENGTH} characters — moderation is NOT password protected.`,
  );
  // Outside Vercel (local sandbox / CLI) we default to an open demo workspace.
  // On Vercel it stays locked unless DEMO_MODE is explicitly enabled.
  if (!process.env.VERCEL || demoRequested()) return "demo";
  return "unconfigured";
}

export function signSession() {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  const signature = createHmac("sha256", process.env.ADMIN_SECRET!).update(expires).digest("hex");
  return `${expires}.${signature}`;
}

export function sessionFor(req: Request): AdminSession {
  const mode = adminMode();
  if (mode !== "protected") return { mode, authenticated: mode === "demo" };
  const token =
    (req.headers.get("cookie") ?? "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${ADMIN_COOKIE}=`))
      ?.slice(ADMIN_COOKIE.length + 1) ?? "";
  const [expires, signature] = token.split(".");
  if (!/^\d+$/.test(expires ?? "") || Number(expires) < Date.now() || !signature) return { mode, authenticated: false };
  const expected = createHmac("sha256", process.env.ADMIN_SECRET!).update(expires).digest("hex");
  return { mode, authenticated: secretMatches(signature, expected) };
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  // Non-browser callers (CLI / native worker) have no Origin header.
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host)
      .split(",")[0]
      .trim();
    return ["http:", "https:"].includes(source.protocol) && source.host === host;
  } catch {
    return false;
  }
}

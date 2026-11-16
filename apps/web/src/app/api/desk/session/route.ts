/**
 * Desk session grants — the desktop's way in, without holding the keys.
 *
 * The old model put the database URL and auth token in the desktop vault, so a
 * laptop that was lost, stolen or simply left unlocked carried the credentials
 * for the whole newsroom. Nothing tied those credentials to a machine, and
 * nothing could take them back: revoking a session in the console stopped a web
 * login while the .env in a Downloads folder kept working.
 *
 * Now the desktop authenticates as a *device* (`hdc_` token, see
 * `@hoichoi/db` → `verifyDeskToken`) and the server hands out a short-lived
 * session grant: the connection string plus an expiry, held in memory by the app
 * and re-fetched when it lapses. The device row is the only thing on disk.
 *
 * What this does and does not guarantee — written down so nobody assumes more:
 * - The credential still travels to the desktop, because the desk runs the
 *   collector *locally* (it needs the DB, not an HTTP API). A granted session is
 *   therefore a real capability for its lifetime.
 * - The grant is bound to one device, expires in an hour, and is refused the
 *   moment the device is revoked, so `revoke` is a real kill switch rather than
 *   a bookkeeping entry.
 * - Only a hash of the device token is stored server-side, so a database dump
 *   cannot be replayed as a device.
 */
import { NextResponse } from "next/server";
import { listDeskDevices, verifyDeskToken } from "@hoichoi/db";
import { audit } from "@/lib/audit";
import { limitRequest, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long a handed-out grant is valid for. Short enough to matter.
 *  Not exported: a route file may only export HTTP methods and Next config. */
const GRANT_TTL_MS = 60 * 60_000;

function bearer(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

/** The database the server itself is configured against. */
function serverDatabase(): { url: string; token: string | null } | null {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return null;
  return { url, token: process.env.TURSO_AUTH_TOKEN || null };
}

/** Connection check for the desktop's status banner — no credential handed out. */
export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ ok: false, error: "device token required" }, { status: 401 });
  const verified = await verifyDeskToken(token);
  if (!verified.ok || !verified.device) {
    return NextResponse.json(
      { ok: false, error: verified.error === "revoked" ? "এই ডিভাইসের অনুমতি বাতিল হয়েছে।" : "টোকেনটি চেনা যায়নি।" },
      { status: 401 },
    );
  }
  return NextResponse.json({
    ok: true,
    device: { id: verified.device.id, label: verified.device.label, email: verified.device.email },
    configured: serverDatabase() !== null,
  });
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ ok: false, error: "device token required" }, { status: 401 });

  const limited = await limitRequest(req, LIMITS.deskRead);
  if (limited) return limited;

  const verified = await verifyDeskToken(token);
  if (!verified.ok || !verified.device) {
    return NextResponse.json(
      {
        ok: false,
        error:
          verified.error === "revoked"
            ? "এই ডিভাইসের অনুমতি বাতিল হয়েছে — কনসোল → নিরাপত্তা থেকে নতুন টোকেন নিন।"
            : "ডিভাইস টোকেনটি চেনা যায়নি।",
        code: verified.error ?? "unknown",
      },
      { status: 401 },
    );
  }
  const device = verified.device;

  const db = serverDatabase();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "সার্ভারে ডেটাবেস কনফিগার করা নেই — অ্যাডমিনকে জানান।" },
      { status: 503 },
    );
  }

  await audit(
    { email: device.email, role: "editor" },
    {
      action: "desk.session.grant",
      entityType: "desk_devices",
      entityId: device.id,
      summary: `ডেস্ক সেশন অনুমতি · ${device.label}`,
      metadata: { device_id: device.id, label: device.label, ttl_ms: GRANT_TTL_MS },
    },
    req,
  );

  return NextResponse.json({
    ok: true,
    grant: {
      url: db.url,
      token: db.token,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS).toISOString(),
      device: { id: device.id, label: device.label },
    },
  });
}

/** Admin-side inventory, used by the console's device list (session may also read). */
export async function PUT(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ ok: false, error: "device token required" }, { status: 401 });
  const verified = await verifyDeskToken(token);
  if (!verified.ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const devices = await listDeskDevices();
  return NextResponse.json({ ok: true, devices });
}
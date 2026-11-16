import { NextResponse } from "next/server";
import { createDeskDevice, listDeskDevices, revokeDeskDevice } from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { limitRequest, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Desk devices — who may drive the newsroom database from a desktop app.
 *
 * The token is shown exactly once, in the create response. Every later read is
 * metadata only (label, prefix, last use), because a list that can show a live
 * token is a list that leaks it the first time someone screenshots the console.
 *
 * Revocation is a stamp, not a delete: the console keeps showing the device so
 * the record of a decommissioned machine survives, and `verifyDeskToken` refuses
 * anything with `revoked_at` set.
 */
export async function GET() {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const devices = await listDeskDevices({ includeRevoked: true });
  return NextResponse.json({ ok: true, devices });
}

export async function POST(req: Request) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  const limited = await limitRequest(req, LIMITS.adminWrite);
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as
    | { action?: string; label?: string; email?: string; id?: string; reason?: string }
    | null;
  if (!body?.action) return NextResponse.json({ ok: false, error: "action required" }, { status: 400 });

  if (body.action === "create") {
    const label = (body.label ?? "").trim();
    if (!label) return NextResponse.json({ ok: false, error: "ডিভাইসের নাম দিন।" }, { status: 400 });
    const email = (body.email ?? user.email).trim().toLowerCase();
    const { device, token } = await createDeskDevice({ email, label, createdBy: user.email });
    await audit(
      user,
      {
        action: "desk.device.create",
        entityType: "desk_devices",
        entityId: device.id,
        summary: `ডেস্ক ডিভাইস যোগ · ${label}`,
        metadata: { email, label },
      },
      req,
    );
    // The only time the token exists outside the hash.
    return NextResponse.json({ ok: true, device, token });
  }

  if (body.action === "revoke") {
    const id = (body.id ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const device = await revokeDeskDevice({ id, by: user.email, reason: body.reason ?? "console revoke" });
    if (!device) return NextResponse.json({ ok: false, error: "ডিভাইসটি পাওয়া যায়নি।" }, { status: 404 });
    await audit(
      user,
      {
        action: "desk.device.revoke",
        entityType: "desk_devices",
        entityId: id,
        summary: `ডেস্ক ডিভাইস বাতিল · ${device.label}`,
        metadata: { reason: body.reason ?? "console revoke" },
      },
      req,
    );
    return NextResponse.json({ ok: true, device });
  }

  return NextResponse.json({ ok: false, error: `unknown action: ${body.action}` }, { status: 400 });
}
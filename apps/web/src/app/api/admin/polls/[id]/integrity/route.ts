import { NextResponse } from "next/server";
import { invalidatePollVotes, pollIntegrity, pollIpGroups } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { limitRequest, LIMITS } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Poll integrity: read the fraud signals, then invalidate a run of votes.
 *
 * The GET is a moderator read — knowing a poll is being stuffed is the whole
 * point of the signals. Invalidation is admin-only, audited, and never deletes:
 * the tally excludes the votes and the rows keep the reason and the actor, so
 * "we removed 412 votes" stays a claim someone can check.
 */
async function pollIdFrom(context: { params: Promise<{ id: string }> }): Promise<number | null> {
  const { id } = await context.params;
  const n = Number(id);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const id = await pollIdFrom(context);
  if (!id) return NextResponse.json({ ok: false, error: "invalid poll id" }, { status: 400 });
  const [report, groups] = await Promise.all([pollIntegrity(id), pollIpGroups(id)]);
  return NextResponse.json({ ok: true, report, groups });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const limited = await limitRequest(req, LIMITS.adminWrite);
  if (limited) return limited;

  const id = await pollIdFrom(context);
  if (!id) return NextResponse.json({ ok: false, error: "invalid poll id" }, { status: 400 });

  let body: { ipHash?: unknown; ids?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const ipHash = typeof body.ipHash === "string" && /^[0-9a-f]{16,64}$/.test(body.ipHash) ? body.ipHash : null;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string" && v.length <= 64)
    : [];
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";
  if (!ipHash && ids.length === 0) {
    return NextResponse.json({ ok: false, error: "ipHash or ids required" }, { status: 400 });
  }
  if (reason.length < 3) {
    return NextResponse.json({ ok: false, error: "কারণ লিখুন (কমপক্ষে ৩ অক্ষর)" }, { status: 400 });
  }

  const invalidated = await invalidatePollVotes(id, {
    ids: ids.length ? ids : undefined,
    allFromIpHash: ipHash,
    reason,
    by: { email: user.email, role: user.role },
  });
  await audit(
    user,
    {
      action: "poll.invalidate",
      entityType: "poll",
      entityId: id,
      summary: `পোল #${id} — ${invalidated}টি ভোট বাতিল (${reason})`,
      metadata: { invalidated, ipHash: ipHash ? `${ipHash.slice(0, 8)}…` : null, ids: ids.length },
    },
    req,
  );
  const report = await pollIntegrity(id);
  return NextResponse.json({ ok: true, invalidated, report });
}

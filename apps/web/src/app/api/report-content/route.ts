import { NextRequest, NextResponse } from "next/server";
import { getClient, getPostBySlug, identityFor, nowIso } from "@hoichoi/db";
import { limitRequest, LIMITS } from "@/lib/rate-limit";
import { clientIp, ensureGuestId } from "@/lib/guest";

/** পাবলিক কনটেন্ট রিপোর্ট → removal_requests কিউ। */
export async function POST(req: NextRequest) {
  const limited = await limitRequest(req, LIMITS.report);
  if (limited) return limited;
  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    reason?: string;
    email?: string;
  } | null;
  if (!body?.slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const post = await getPostBySlug(body.slug);
  if (!post) {
    return NextResponse.json({ error: "unknown post slug" }, { status: 404 });
  }

  const identity = await identityFor({
    guestId: await ensureGuestId(),
    email: body.email ?? null,
    ip: clientIp(req),
  });

  const client = getClient();
  await client.execute({
    sql: `
      INSERT INTO removal_requests
        (id, post_id, reason, reporter_email, status, created_at, guest_id, email_hash, ip_hash, trust_score)
      VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
    `,
    args: [
      crypto.randomUUID(),
      post.id,
      body.reason?.trim() || null,
      body.email?.trim() || null,
      nowIso(),
      identity.guestId,
      identity.emailHash,
      identity.ipHash,
      identity.trustScore,
    ],
  });
  return NextResponse.json({ ok: true });
}
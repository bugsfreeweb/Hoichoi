import { NextRequest, NextResponse } from "next/server";
import {
  deleteClaim,
  getPostById,
  gradeFromEvidence,
  listClaims,
  listCorrections,
  recordCorrection,
  setVerification,
  upsertClaim,
  VERIFICATION_LABELS,
  type ClaimStatus,
  type VerificationStatus,
} from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const GRADES = Object.keys(VERIFICATION_LABELS) as VerificationStatus[];
const CLAIM_STATUSES: ClaimStatus[] = ["unchecked", "supported", "disputed", "false"];

/**
 * Verification record for one post.
 *
 * GET  → the post's grade, its claims and its correction history.
 * POST → one of three actions:
 *   { action: "grade",  status? }   set the grade (derived when omitted)
 *   { action: "claim",  … }         add/update a checkable claim + evidence
 *   { action: "claim_delete", id }  drop a claim
 *
 * The grade is never accepted blindly: when `status` is omitted the server asks
 * `gradeFromEvidence` (source count, named verifier, disputed claims), so an
 * editor cannot label something "editor verified" with nothing behind it.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const { postId } = await ctx.params;
  const post = await getPostById(postId);
  if (!post) return NextResponse.json({ ok: false, error: "পোস্ট পাওয়া যায়নি।" }, { status: 404 });
  const [claims, corrections] = await Promise.all([listClaims(postId), listCorrections(postId)]);
  return NextResponse.json({
    ok: true,
    post: {
      id: post.id,
      title_bn: post.title_bn,
      source_name: post.source_name,
      source_url: post.source_url,
      verification_status: post.verification_status ?? "unverified",
      verification_note: post.verification_note ?? null,
      verified_by: post.verified_by ?? null,
      verified_at: post.verified_at ?? null,
    },
    claims,
    corrections,
    grades: GRADES,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { postId } = await ctx.params;
  const post = await getPostById(postId);
  if (!post) return NextResponse.json({ ok: false, error: "পোস্ট পাওয়া যায়নি।" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | {
        action?: string;
        status?: string;
        note?: string;
        id?: string;
        claimId?: string;
        claimBn?: string;
        /** snake_case is accepted too: the console posts its form state as-is. */
        claim_bn?: string;
        evidenceUrl?: string;
        evidence_url?: string;
        evidenceNote?: string;
      }
    | null;
  const action = body?.action;

  if (action === "claim") {
    const claimText = (body?.claimBn ?? body?.claim_bn ?? "").trim();
    if (!claimText) return NextResponse.json({ ok: false, error: "দাবির লেখা দরকার।" }, { status: 400 });
    const claimStatus = CLAIM_STATUSES.includes(body?.status as ClaimStatus) ? (body?.status as ClaimStatus) : "unchecked";
    const claim = await upsertClaim({
      id: body?.claimId,
      postId,
      claimBn: claimText,
      status: claimStatus,
      evidenceUrl: body?.evidenceUrl ?? body?.evidence_url ?? null,
      evidenceNote: body?.evidenceNote ?? null,
      checkedBy: user.email,
    });
    await audit(
      user,
      {
        action: "verification.claim",
        entityType: "post",
        entityId: postId,
        summary: `দাবি ${body?.claimId ? "আপডেট" : "যোগ"}: ${claimStatus}`,
      },
      req,
    );
    return NextResponse.json({ ok: true, claim });
  }

  if (action === "claim_delete") {
    const id = body?.id?.trim();
    if (!id) return NextResponse.json({ ok: false, error: "id দরকার।" }, { status: 400 });
    const removed = await deleteClaim(id);
    await audit(user, { action: "verification.claim_delete", entityType: "post", entityId: postId, summary: "দাবি মুছে ফেলা হয়েছে" }, req);
    return NextResponse.json({ ok: true, removed });
  }

  if (action !== "grade") {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }

  const claims = await listClaims(postId);
  const corrections = await listCorrections(postId);
  const requested = body?.status;
  if (requested && !GRADES.includes(requested as VerificationStatus)) {
    return NextResponse.json({ ok: false, error: "অজানা গ্রেড।" }, { status: 400 });
  }

  // Derived grade: the strongest thing the evidence supports, unless the editor
  // explicitly picks a weaker one (downgrading is always allowed).
  const derived = gradeFromEvidence({
    sourceCount: post.source_url ? 1 : 0,
    verifierName: user.role === "admin" || user.role === "editor" ? user.email : null,
    claims,
    correctedAt: corrections[0]?.created_at ?? null,
  });
  const order: VerificationStatus[] = ["unverified", "single_source", "multi_source", "corrected", "human_verified"];
  const chosen = (requested as VerificationStatus | undefined) ?? derived;
  const finalStatus = order.indexOf(chosen) <= order.indexOf(derived) ? chosen : derived;

  await setVerification(
    postId,
    finalStatus,
    { note: body?.note ?? post.verification_note ?? null, verifierName: user.email },
  );
  await audit(
    user,
    {
      action: "verification.grade",
      entityType: "post",
      entityId: postId,
      summary: `যাচাই গ্রেড: ${finalStatus}${finalStatus !== chosen ? ` (evidence allows ${derived})` : ""}`,
      metadata: { requested: chosen, derived, claims: claims.length },
    },
    req,
  );

  return NextResponse.json({ ok: true, status: finalStatus, derived, clamped: finalStatus !== chosen });
}

/** Record a correction; the caller supplies the old/new text it is replacing. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin" && user.role !== "editor") return forbidden();
  const { postId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { field?: string; oldValue?: string; newValue?: string; reason?: string }
    | null;
  if (!body?.field) return NextResponse.json({ ok: false, error: "field দরকার।" }, { status: 400 });
  const row = await recordCorrection({
    postId,
    field: body.field,
    oldValue: body.oldValue ?? null,
    newValue: body.newValue ?? null,
    reason: body.reason ?? null,
    correctedBy: user.email,
  });
  await setVerification(postId, "corrected", { note: body.reason ?? null, verifierName: user.email });
  await audit(user, { action: "verification.correct", entityType: "post", entityId: postId, summary: `সংশোধন: ${body.field}` }, req);
  return NextResponse.json({ ok: true, correction: row });
}

import { NextRequest, NextResponse } from "next/server";
import {
  getPostById,
  listImageReviews,
  listPostImages,
  recordImageReview,
} from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { validateBody } from "@/lib/validate";

export const dynamic = "force-dynamic";

const VERDICTS = ["approved", "rejected"] as const;
type Verdict = (typeof VERDICTS)[number];

const REVIEW_BODY = {
  path: { kind: "string", min: 1, max: 400, label: "ছবির পথ" },
  verdict: { kind: "enum", values: VERDICTS, label: "সিদ্ধান্ত" },
  reason: {
    kind: "string",
    max: 200,
    optional: true,
    nullable: true,
    label: "কারণ",
  },
} as const;

/**
 * Per-image approval record for one post.
 *
 * GET  → every image the post would publish, each with its standing verdict and
 *        the history behind it. An image with no row is `unreviewed`, which is
 *        not an approval.
 * POST → { path, verdict } records one human decision against one image.
 *
 * The record is what makes "an operator looked at this picture" checkable, and a
 * standing rejection is what the publish path refuses to push live.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const { id } = await ctx.params;
  const post = await getPostById(id);
  if (!post)
    return NextResponse.json(
      { ok: false, error: "পোস্ট পাওয়া যায়নি।" },
      { status: 404 },
    );

  const [gallery, reviews] = await Promise.all([
    listPostImages(id).catch(() => []),
    listImageReviews(id),
  ]);
  const paths: string[] = [];
  const push = (value: string | null | undefined) => {
    if (value && !paths.includes(value)) paths.push(value);
  };
  push(post.media_path);
  for (const image of gallery) push(image.path);

  return NextResponse.json({
    ok: true,
    images: paths.map((path) => {
      const mine = reviews.filter((r) => r.path === path);
      const standing = mine[0] ?? null; // newest first
      return {
        path,
        standing: standing?.verdict ?? null,
        reviewed_by: standing?.reviewed_by ?? null,
        reviewed_at: standing?.reviewed_at ?? null,
        reason: standing?.reason ?? null,
        history: mine.length,
      };
    }),
    reviews,
    reasons: [
      "নকল/ওয়াটারমার্ক",
      "প্রাসঙ্গিক নয়",
      "মান খারাপ",
      "শনাক্তযোগ্য মুখ",
      "ভুল তথ্যের ইঙ্গিত",
    ],
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const { id } = await ctx.params;
  const post = await getPostById(id);
  if (!post)
    return NextResponse.json(
      { ok: false, error: "পোস্ট পাওয়া যায়নি।" },
      { status: 404 },
    );

  // One shared validator, so an unknown field or a `verdict: 1` is a 400 naming
  // the field — not a silently ignored key or a 500 in the log.
  const parsed = validateBody(await req.json().catch(() => null), REVIEW_BODY);
  if (!parsed.ok)
    return NextResponse.json(
      { ok: false, error: parsed.error, field: parsed.field },
      { status: 400 },
    );
  const path = parsed.value.path as string;
  const verdict = parsed.value.verdict as Verdict;
  const reason = (parsed.value.reason as string | null) ?? null;

  const review = await recordImageReview({
    postId: id,
    path,
    verdict,
    reason,
    reviewedBy: user.email,
  });
  await audit(
    user,
    {
      action: "image.review",
      entityType: "post",
      entityId: id,
      summary: `${verdict === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}: ${path.split("/").pop() ?? path}`,
    },
    req,
  );
  return NextResponse.json({ ok: true, review });
}

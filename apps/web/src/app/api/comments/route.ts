import { NextRequest, NextResponse } from "next/server";
import {
  getPostComments,
  getPostCommentCount,
  getAllComments,
  createComment,
  setCommentStatus,
  deleteComment,
  getPostById,
  parseAppConfig,
} from "@hoichoi/db";
import { requireApiUser, unauthorized } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function bad(msg = "Bad request"): NextResponse {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

/**
 * GET /api/comments?postId=<slug|id>  → approved comments (public)
 * GET /api/comments                    → every comment + post (admin/moderation)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("postId")?.trim();

  if (ref) {
    // Public post page: only the newest N approved comments are rendered,
    // alongside a total counter. N = admin "comments_show_count" knob.
    const settings = await getSettings();
    const limit = Math.max(1, parseAppConfig(settings.app_config_json).comments_show_count);
    const [comments, total] = await Promise.all([
      getPostComments(ref, limit),
      getPostCommentCount(ref),
    ]);
    return NextResponse.json({ ok: true, comments, total });
  }

  // No postId → admin moderation queue.
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const comments = await getAllComments();
  return NextResponse.json({ ok: true, comments });
}

/**
 * POST /api/comments  { postId, author, body, email?, website? }
 * Public — a new comment always lands in the moderation queue (status = pending).
 * `website` is a honeypot: any value means an automated bot → silently dropped.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return bad();
  }
  const { postId, author, body, email, website } = (payload ?? {}) as {
    postId?: unknown;
    author?: unknown;
    body?: unknown;
    email?: unknown;
    website?: unknown;
  };
  const ref = typeof postId === "string" ? postId.trim() : "";
  const authorStr = typeof author === "string" ? author.trim() : "";
  const bodyStr = typeof body === "string" ? body.trim() : "";
  const emailStr = typeof email === "string" ? email.trim() : "";
  const honeypot = typeof website === "string" ? website.trim() : "";

  if (!ref || authorStr.length < 2 || authorStr.length > 60 || bodyStr.length < 2 || bodyStr.length > 800) {
    return bad("নাম/মন্তব্য খুব ছোট বা খুব দীর্ঘ");
  }
  if (emailStr.length > 120) return bad("ইমেইল খুব দীর্ঘ");

  const post = await getPostById(ref);
  if (!post) {
    return NextResponse.json({ ok: false, error: "প্রতিবেদন পাওয়া যায়নি" }, { status: 404 });
  }

  // Honeypot trip → pretend success, persist nothing.
  if (honeypot) {
    return NextResponse.json({ ok: true, message: "মন্তব্য জমা হয়েছে।" }, { status: 201 });
  }

  try {
    const comment = await createComment({ postId: post.id, author: authorStr, body: bodyStr, email: emailStr || null });
    return NextResponse.json(
      { ok: true, comment, message: "আপনার মন্তব্য সম্পাদকীয় পর্যালোচনায় গেছে — অনুমোদনের পর প্রকাশিত হবে।" },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Insert failed" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/comments  { id, action: "approve" | "block" }
 * Admin/moderation — used by the web admin console and the desktop desk view.
 */
export async function PATCH(req: Request) {
  const user = await requireApiUser();
  if (!user) return unauthorized();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return bad();
  }
  const { id, action } = (payload ?? {}) as { id?: unknown; action?: unknown };
  const nid = typeof id === "string" ? id.trim() : "";
  const status = action === "approve" ? "approved" : action === "block" ? "blocked" : null;

  if (!nid || !status) return bad();
  try {
    await setCommentStatus(nid, status);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: nid, status });
}

/**
 * DELETE /api/comments  { id }
 * Admin/moderation — hard-removes a comment.
 */
export async function DELETE(req: Request) {
  const user = await requireApiUser();
  if (!user) return unauthorized();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return bad();
  }
  const id = typeof (payload as { id?: unknown } | null)?.id === "string"
    ? (payload as { id: string }).id.trim()
    : "";
  if (!id) return bad();
  try {
    await deleteComment(id);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id });
}
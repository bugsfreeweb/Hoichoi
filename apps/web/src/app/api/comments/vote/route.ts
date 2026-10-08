import { NextRequest, NextResponse } from "next/server";
import { voteComment } from "@hoichoi/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/comments/vote  { id, vote: "like" | "dislike" }
 * Public — a single increment per call. The client keeps a localStorage guard
 * so a browser votes once per comment; this endpoint only sanity-checks input.
 */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  const { id, vote } = (payload ?? {}) as { id?: unknown; vote?: unknown };
  const cid = typeof id === "string" ? id.trim() : "";
  const kind = vote === "like" || vote === "dislike" ? vote : null;
  if (!cid || !kind) {
    return NextResponse.json({ ok: false, error: "id and vote required" }, { status: 400 });
  }
  try {
    const counters = await voteComment(cid, kind);
    if (!counters) {
      return NextResponse.json({ ok: false, error: "প্রতিক্রিয়া দেওয়া যায়নি" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...counters });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Vote failed" },
      { status: 500 },
    );
  }
}

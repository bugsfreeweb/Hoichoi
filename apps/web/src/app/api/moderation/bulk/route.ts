import { NextRequest, NextResponse } from "next/server";
import { getCategory, getClient, getPostById, nowIso } from "@hoichoi/db";
import { audit } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth";

/**
 * Bulk moderation, with the two-approval gate kept intact.
 *
 * A backlog of forty pending drafts is cleared one at a time today, which is why
 * it stays a backlog. This endpoint clears a selection in one round trip and
 * still refuses to do anything a human has to do:
 *
 *   - **approve is not publish.** The bulk path can move a post out of
 *     `pending_review`, exactly like pressing approve on its card; it cannot
 *     publish. Publishing stays a single, deliberate action.
 *   - **a double-approval desk is skipped, not folded in.** A category that
 *     requires a second signature cannot be satisfied by a checkbox, so those
 *     posts are reported back untouched with a Bangla reason instead of being
 *     silently approved. A bulk action that quietly bypassed the two-person rule
 *     would be worse than no bulk action.
 *   - **every item is audited**, one row each, so the log answers "who approved
 *     these twenty" with twenty rows rather than one summary.
 *
 * Partial failure is normal and is reported per item: the caller learns exactly
 * which posts moved and which did not, and why.
 */
const MAX_IDS = 100;

export async function POST(req: NextRequest) {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  const body = (await req.json().catch(() => null)) as
    | { ids?: unknown; action?: unknown; note?: unknown }
    | null;
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be approve or reject — publishing is never bulk" },
      { status: 400 },
    );
  }

  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.filter((v): v is string => typeof v === "string" && v.trim().length > 0))]
    : [];
  if (ids.length === 0) return NextResponse.json({ error: "no posts selected" }, { status: 400 });
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `একবারে সর্বোচ্চ ${MAX_IDS}টি পোস্ট — নির্বাচন ছোট করুন।` },
      { status: 400 },
    );
  }

  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null;
  const client = getClient();

  const approved: string[] = [];
  const rejected: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  const failed: Array<{ id: string; reason: string }> = [];

  for (const id of ids) {
    try {
      const post = await getPostById(id);
      if (!post) {
        failed.push({ id, reason: "পোস্ট পাওয়া যায়নি" });
        continue;
      }

      if (action === "approve") {
        // A rejected/removed/published post is not a pending draft; moving it
        // "back" to approved would be an edit nobody asked for.
        if (post.status !== "pending_review") {
          skipped.push({ id, reason: `অবস্থা ${post.status} — অনুমোদন প্রযোজ্য নয়` });
          continue;
        }
        const cat = await getCategory(post.category);
        if (cat?.config.requires_double_approval) {
          skipped.push({ id, reason: "দ্বিতীয় অনুমোদন প্রয়োজন — কার্ডে আলাদাভাবে স্বাক্ষর করুন" });
          continue;
        }
        await client.execute({
          sql: "UPDATE posts SET status = 'approved', updated_at = ? WHERE id = ?",
          args: [nowIso(), id],
        });
        approved.push(id);
        await audit(
          user,
          {
            action: "moderation.approve",
            entityType: "posts",
            entityId: id,
            summary: "বাল্ক অনুমোদন",
            metadata: { bulk: true, ...(note ? { note } : {}) },
          },
          req,
        );
      } else {
        if (post.status === "removed" || post.status === "rejected") {
          skipped.push({ id, reason: `অবস্থা ${post.status} — প্রত্যাখ্যান প্রযোজ্য নয়` });
          continue;
        }
        await client.execute({
          sql: "UPDATE posts SET status = 'rejected', updated_at = ? WHERE id = ?",
          args: [nowIso(), id],
        });
        rejected.push(id);
        await audit(
          user,
          {
            action: "moderation.reject",
            entityType: "posts",
            entityId: id,
            summary: "বাল্ক প্রত্যাখ্যান",
            metadata: { bulk: true, ...(note ? { note } : {}) },
          },
          req,
        );
      }
    } catch (err) {
      failed.push({ id, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    approved: approved.length,
    rejected: rejected.length,
    ids: action === "approve" ? approved : rejected,
    skipped,
    failed,
  });
}

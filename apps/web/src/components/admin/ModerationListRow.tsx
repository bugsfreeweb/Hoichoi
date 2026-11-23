"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { Post } from "@hoichoi/shared-types";
import { useAdminAction } from "@/lib/admin-api";
import { useBi } from "@/components/i18n/LocaleProvider";
import { AdminThumb, OriginBadge } from "./AdminThumb";
import { QuickImageButton } from "./QuickImageButton";

/**
 * Compact list counterpart of `ModerationCard`.
 *
 * Same actions, same feedback, one line per post — for a backlog big enough that
 * reading full cards is slow. Approve/reject here never asks for a note; the
 * double-approval categories still require an approver signature server-side and
 * will answer with that reason, which is shown in the toast.
 */
export function ModerationListRow({ post, queue }: { post: Post; queue: "pending" | "approved" }) {
  const b = useBi();
  const [busy, setBusy] = useState<null | string>(null);
  const run = useAdminAction();

  async function act(action: "approve" | "publish" | "reject") {
    setBusy(action);
    const labels = {
      approve: { busy: b("অনুমোদন দেওয়া হচ্ছে…", "Approving…"), success: b("✓ অনুমোদন সম্পন্ন", "✓ Approved") },
      publish: { busy: b("প্রকাশ করা হচ্ছে…", "Publishing…"), success: b("✓ পোস্ট প্রকাশিত", "✓ Post published") },
      reject: { busy: b("প্রত্যাখ্যান করা হচ্ছে…", "Rejecting…"), success: b("✓ প্রত্যাখ্যান সম্পন্ন", "✓ Rejected") },
    }[action];
    const data = await run({
      path: `/api/moderation/${post.id}`,
      init: { method: "POST", body: JSON.stringify({ action }) },
      busy: labels.busy,
      success: labels.success,
      detail: (d) => {
        const r = d as { status?: string; approverRequired?: boolean } | null;
        if (r?.approverRequired)
          return b(
            "দ্বিতীয় অনুমোদন প্রয়োজন — approver স্বাক্ষর ছাড়া প্রকাশ হবে না।",
            "A second approval is required — nothing publishes without an approver's signature.",
          );
        return r?.status ? b(`বর্তমান অবস্থা: ${r.status}`, `Current status: ${r.status}`) : undefined;
      },
    });
    setBusy(null);
    if (data) setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-paper-deep px-3 py-2.5 hover:bg-paper">
      <AdminThumb post={post} size="sm" />
      <div className="min-w-[200px] flex-1">
        <Link href={`/post/${post.slug}`} className="block truncate text-[13px] font-bold text-ink hover:text-alizarin">
          {post.title_bn}
        </Link>
        <p className="truncate text-[11px] text-ink-soft">{post.summary_bn ?? post.body_bn}</p>
        <p className="truncate font-mono-x text-[9.5px] text-ink-soft">
          {post.category} · {post.source_name}
          {post.category === "child-sexual-abuse" ? " · 🔒 double" : ""}
        </p>
      </div>
      <OriginBadge post={post} />
      <QuickImageButton postId={post.id} hasImage={Boolean(post.media_path)} compact />
      <span className="flex items-center gap-1.5">
        {queue === "pending" ? (
          <>
            <button
              type="button"
              onClick={() => void act("approve")}
              disabled={busy !== null}
              className="border border-cat-teal bg-cat-teal/15 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-cat-teal/25 disabled:opacity-50"
            >
              {busy === "approve" ? <Loader2 size={11} className="animate-spin" /> : b("অনুমোদন", "Approve")}
            </button>
            <button
              type="button"
              onClick={() => void act("reject")}
              disabled={busy !== null}
              className="border border-alizarin px-2.5 py-1 text-[11px] font-bold text-alizarin hover:bg-alizarin hover:text-on-accent disabled:opacity-50"
            >
              {busy === "reject" ? <Loader2 size={11} className="animate-spin" /> : b("প্রত্যাখ্যান", "Reject")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void act("publish")}
            disabled={busy !== null}
            className="border border-cat-blue bg-cat-blue/15 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-cat-blue/25 disabled:opacity-50"
          >
            {busy === "publish" ? <Loader2 size={11} className="animate-spin" /> : b("প্রকাশ করুন", "Publish")}
          </button>
        )}
      </span>
    </div>
  );
}

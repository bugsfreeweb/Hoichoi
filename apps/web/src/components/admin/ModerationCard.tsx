"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAction } from "@/lib/admin-api";
import type { Post } from "@hoichoi/shared-types";
import Link from "next/link";
import { QuickImageButton } from "./QuickImageButton";
import { OriginMark, PostCover } from "./PostCover";
import { imageOrigin } from "@/lib/image-origin";
import { useBi } from "@/components/i18n/LocaleProvider";

/**
 * One reviewable story, as a card.
 *
 * Two things changed here after looking at the queue rather than the code:
 *
 *  - **the picture fills its frame.** The card used to place a fixed-size
 *    thumbnail beside a paragraph, so at three-across the image was a stamp in a
 *    wide white box and the card read as a form, not a review. The cover is now
 *    the top of the card, with the title and the actions under it.
 *  - **a card can be selected.** Checking forty drafts one at a time is why the
 *    backlog stays a backlog; the checkbox feeds `ModerationGrid`'s bulk action.
 *
 * The card still refuses to be a shortcut for the double-approval gate: a story
 * from a desk that needs a second signature cannot be checked, and says why.
 */
export function ModerationCard({
  post,
  queue,
  selected = false,
  onSelect,
  locked = false,
}: {
  post: Post;
  queue: "pending" | "approved";
  selected?: boolean;
  onSelect?: (id: string, next: boolean) => void;
  /** A desk that needs a second signature: bulk approval is not offered. */
  locked?: boolean;
}) {
  const b = useBi();
  const [busy, setBusy] = useState<null | string>(null);
  const [note, setNote] = useState("");
  const run = useAdminAction();
  const o = imageOrigin(post);

  /**
   * The old version ignored the response and reloaded unconditionally, so a
   * rejected approval (403, missing approver note, DB error) looked identical to
   * a successful one. Now every outcome is reported, with the server's message.
   */
  async function act(action: "approve" | "publish" | "reject") {
    setBusy(action);
    const labels = {
      approve: { busy: b("অনুমোদন দেওয়া হচ্ছে…", "Approving…"), success: b("✓ অনুমোদন সম্পন্ন", "✓ Approved") },
      publish: { busy: b("প্রকাশ করা হচ্ছে…", "Publishing…"), success: b("✓ পোস্ট প্রকাশিত", "✓ Post published") },
      reject: { busy: b("প্রত্যাখ্যান করা হচ্ছে…", "Rejecting…"), success: b("✓ প্রত্যাখ্যান সম্পন্ন", "✓ Rejected") },
    }[action];
    const data = await run({
      path: `/api/moderation/${post.id}`,
      init: {
        method: "POST",
        body: JSON.stringify({ action, note: note || undefined }),
      },
      busy: labels.busy,
      success: labels.success,
      detail: (d) => {
        const r = d as { status?: string; approverRequired?: boolean } | null;
        if (r?.approverRequired)
          return b(
            "দ্বিতীয় অনুমোদন প্রয়োজন — approver স্বাক্ষর ছাড়া প্রকাশ হবে না।",
            "A second approval is required — nothing publishes without an approver's signature.",
          );
        return r?.status
          ? b(`বর্তমান অবস্থা: ${r.status}`, `Current status: ${r.status}`)
          : undefined;
      },
    });
    setBusy(null);
    if (data) setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div
      className={`flex flex-col border bg-paper-deep transition-colors ${
        selected ? "border-alizarin" : "border-ink/20 hover:border-ink/40"
      }`}
    >
      <div className="relative">
        <Link href={`/admin/posts/${post.id}`} className="block">
          <PostCover post={post} />
        </Link>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0b0e14]/90 via-[#0b0e14]/40 to-transparent" />
        <label
          className="absolute top-1.5 left-1.5 flex h-5 w-5 cursor-pointer items-center justify-center border border-ink/30 bg-paper"
          title={
            locked
              ? b(
                  "দ্বিতীয় অনুমোদন প্রয়োজন — এককভাবে অনুমোদন করুন",
                  "A second approval is required — approve this one on its own",
                )
              : b("বাল্ক অনুমোদনের জন্য নির্বাচন", "Select for bulk approval")
          }
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={locked || !onSelect}
            onChange={(e) => onSelect?.(post.id, e.target.checked)}
            aria-label={b(`${post.title_bn} নির্বাচন করুন`, `Select ${post.title_bn}`)}
            className="h-4 w-4 border border-ink/50 accent-alizarin disabled:opacity-40"
          />
        </label>
        <span className="absolute top-1.5 right-1.5">
          <OriginMark origin={o} />
        </span>
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1.5">
          <span className="rounded-sm bg-paper px-1.5 py-0.5 text-[9px] font-bold text-ink">
            {post.category}
            {locked ? " · 🔒" : ""}
          </span>
          <span className="font-mono-x text-[9px] text-paper">{post.source_name ?? ""}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 pt-1.5">
        <Link
          href={`/admin/posts/${post.id}`}
          className="line-clamp-2 font-serif-bn text-[13px] font-extrabold leading-snug text-ink hover:text-alizarin"
        >
          {post.title_bn}
        </Link>
        <p className="line-clamp-2 text-[10.5px] leading-relaxed text-ink-soft">{post.summary_bn ?? post.body_bn}</p>

        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          <QuickImageButton postId={post.id} hasImage={Boolean(post.media_path)} compact />
          <Link
            href={`/post/${post.slug}`}
            className="font-mono-x text-[9px] text-ink-soft underline hover:text-alizarin"
            title={b("পাবলিক পোস্ট দেখুন", "Open the public post")}
          >
            /post ↗
          </Link>
        </div>

        <input
          type="text"
          placeholder={b("নোট (ঐচ্ছিক)", "Note (optional)")}
          aria-label={b("নোট", "Note")}
          className="w-full border border-ink/25 bg-paper px-1.5 py-1 text-[11px] focus:outline-none"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center gap-1 pb-2">
          {queue === "pending" ? (
            <>
              <ActionBtn label={b("অনুমোদন", "Approve")} busy={busy === "approve"} onClick={() => act("approve")} color="cat-teal" />
              <ActionBtn label={b("প্রত্যাখ্যান", "Reject")} busy={busy === "reject"} onClick={() => act("reject")} color="alizarin" />
            </>
          ) : (
            <ActionBtn label={b("প্রকাশ করুন", "Publish")} busy={busy === "publish"} onClick={() => act("publish")} color="cat-blue" />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, busy, onClick, color }: { label: string; busy: boolean; onClick: () => void; color: string }) {
  const busyLabel = useBi()("চলছে…", "Working…");
  const bg = color === "cat-teal" ? "bg-cat-teal" : color === "alizarin" ? "bg-alizarin" : "bg-cat-blue";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex-1 border-2 border-ink ${bg} px-2 py-1 text-[11px] font-bold text-ink transition hover:brightness-95 disabled:opacity-50`}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" /> {busyLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

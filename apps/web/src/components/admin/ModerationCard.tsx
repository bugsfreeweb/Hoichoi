"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAction } from "@/lib/admin-api";
import type { Post } from "@hoichoi/shared-types";
import Link from "next/link";
import { QuickImageButton } from "./QuickImageButton";
import { OriginMark, PostCover } from "./PostCover";
import { imageOrigin } from "@/lib/image-origin";

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
      approve: { busy: "অনুমোদন দেওয়া হচ্ছে…", success: "✓ অনুমোদন সম্পন্ন" },
      publish: { busy: "প্রকাশ করা হচ্ছে…", success: "✓ পোস্ট প্রকাশিত" },
      reject: { busy: "প্রত্যাখ্যান করা হচ্ছে…", success: "✓ প্রত্যাখ্যান সম্পন্ন" },
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
        if (r?.approverRequired) return "দ্বিতীয় অনুমোদন প্রয়োজন — approver স্বাক্ষর ছাড়া প্রকাশ হবে না।";
        return r?.status ? `বর্তমান অবস্থা: ${r.status}` : undefined;
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
          title={locked ? "দ্বিতীয় অনুমোদন প্রয়োজন — এককভাবে অনুমোদন করুন" : "বাল্ক অনুমোদনের জন্য নির্বাচন"}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={locked || !onSelect}
            onChange={(e) => onSelect?.(post.id, e.target.checked)}
            aria-label={`${post.title_bn} নির্বাচন করুন`}
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
            title="পাবলিক পোস্ট দেখুন"
          >
            /post ↗
          </Link>
        </div>

        <input
          type="text"
          placeholder="নোট (ঐচ্ছিক)"
          aria-label="নোট"
          className="w-full border border-ink/25 bg-paper px-1.5 py-1 text-[11px] focus:outline-none"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center gap-1 pb-2">
          {queue === "pending" ? (
            <>
              <ActionBtn label="অনুমোদন" busy={busy === "approve"} onClick={() => act("approve")} color="cat-teal" />
              <ActionBtn label="প্রত্যাখ্যান" busy={busy === "reject"} onClick={() => act("reject")} color="alizarin" />
            </>
          ) : (
            <ActionBtn label="প্রকাশ করুন" busy={busy === "publish"} onClick={() => act("publish")} color="cat-blue" />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, busy, onClick, color }: { label: string; busy: boolean; onClick: () => void; color: string }) {
  const bg = color === "cat-teal" ? "bg-cat-teal" : color === "alizarin" ? "bg-alizarin" : "bg-cat-blue";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex-1 border-2 border-ink ${bg} px-2 py-1 text-[11px] font-bold text-ink transition hover:brightness-95 disabled:opacity-50`}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" /> চলছে…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

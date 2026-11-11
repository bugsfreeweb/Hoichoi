"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAction } from "@/lib/admin-api";
import type { Post } from "@hoichoi/shared-types";
import Link from "next/link";

export function ModerationCard({ post, queue }: { post: Post; queue: "pending" | "approved" }) {
  const [busy, setBusy] = useState<null | string>(null);
  const [note, setNote] = useState("");
  const run = useAdminAction();

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
    <div className="border border-ink/20 bg-paper-deep p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-[70%]">
          <p className="font-serif-bn text-[19px] font-black leading-snug text-ink">{post.title_bn}</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            <Link href={`/post/${post.slug}`} className="underline hover:text-alizarin">
              /post/{post.slug}
            </Link>
            {" · "}source: {post.source_name}
          </p>
        </div>
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {post.category}
          {post.category === "child-sexual-abuse" ? " · 🔒 double" : ""}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-ink-soft">{post.body_bn}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <textarea
          rows={1}
          placeholder="নোট (ঐচ্ছিক)"
          className="min-w-[140px] flex-1 border border-ink/30 bg-paper px-3 py-1.5 text-[12.5px] focus:outline-none"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {queue === "pending" ? (
          <>
            <ActionBtn label="অনুমোদন / পরবর্তী ধাপ" busy={busy === "approve"} onClick={() => act("approve")} color="cat-teal" />
            <ActionBtn label="প্রত্যাখ্যান" busy={busy === "reject"} onClick={() => act("reject")} color="alizarin" />
          </>
        ) : (
          <ActionBtn label="প্রকাশ করুন" busy={busy === "publish"} onClick={() => act("publish")} color="cat-blue" />
        )}
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
      className={`border-2 border-ink ${bg} px-4 py-1.5 text-[12px] font-bold text-ink transition hover:brightness-95 disabled:opacity-50`}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> চলছে…
        </span>
      ) : (
        label
      )}
    </button>
  );
}
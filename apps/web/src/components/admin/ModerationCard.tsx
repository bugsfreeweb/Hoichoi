"use client";

import { useState } from "react";
import type { Post } from "@hoichoi/shared-types";
import Link from "next/link";

export function ModerationCard({ post, queue }: { post: Post; queue: "pending" | "approved" }) {
  const [busy, setBusy] = useState<null | string>(null);
  const [note, setNote] = useState("");

  async function act(action: "approve" | "publish" | "reject") {
    setBusy(action);
    try {
      await fetch(`/api/moderation/${post.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined }),
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
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
      {busy ? "…" : label}
    </button>
  );
}
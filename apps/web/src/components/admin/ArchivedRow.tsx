"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@hoichoi/shared-types";

/**
 * One archived post, with a permanent-delete control.
 *
 * Deletion is a two-step confirm rather than a native confirm() dialog so the
 * consequence is spelled out — a legal hold is shown as blocked instead of
 * offering a button that will refuse, which used to be indistinguishable from
 * a broken control.
 */
export function ArchivedRow({ post }: { post: Post }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = async () => {
    setError(null);
    const res = await fetch("/api/admin/archive/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: post.id }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "মুছে ফেলা যায়নি");
      setConfirming(false);
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-ink">{post.title_bn}</p>
        <p className="font-mono-x text-[11px] text-ink-soft">
          {post.slug} · {post.archive_reason} · {post.archived_at}
          {post.legal_hold && <span className="ml-2 text-alizarin">⚠ LEGAL HOLD</span>}
        </p>
        {error && <p className="mt-1 text-[11.5px] font-bold text-alizarin">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {post.category}
        </span>
        {post.legal_hold ? (
          <span
            className="rounded-lg border border-alizarin/40 px-3 py-1.5 text-[11px] font-bold text-alizarin"
            title="Legal hold থাকায় মুছে ফেলা যাবে না"
          >
            🔒 হোল্ড
          </span>
        ) : confirming ? (
          <span className="flex items-center gap-2">
            <button
              onClick={() => void remove()}
              disabled={pending}
              className="rounded-lg bg-alizarin px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-alizarin/80 disabled:opacity-60"
            >
              {pending ? "মুছছে…" : "নিশ্চিত করুন"}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="rounded-lg border border-ink/30 px-3 py-1.5 text-[11px] font-bold text-ink-soft transition-colors hover:border-ink"
            >
              বাতিল
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-ink/30 px-3 py-1.5 text-[11px] font-bold text-ink-soft transition-colors hover:border-alizarin hover:text-alizarin"
          >
            স্থায়ীভাবে মুছুন
          </button>
        )}
      </div>
    </div>
  );
}

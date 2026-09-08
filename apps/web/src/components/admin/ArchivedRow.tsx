"use client";

import type { Post } from "@hoichoi/shared-types";

export function ArchivedRow({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-bold text-ink">{post.title_bn}</p>
        <p className="font-mono-x text-[11px] text-ink-soft">
          {post.slug} · {post.archive_reason} · {post.archived_at}
          {post.legal_hold && <span className="ml-2 text-alizarin">⚠ LEGAL HOLD</span>}
        </p>
      </div>
      <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
        {post.category}
      </span>
    </div>
  );
}
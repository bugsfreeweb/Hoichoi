"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAction } from "@/lib/admin-api";
import type { RemovalRequest } from "@hoichoi/shared-types";
import Link from "next/link";

export type RemovalPostRef = { slug: string; title: string; mediaPath?: string | null; mediaKind?: string | null };

export function RemovalRow({
  req,
  post,
  compact = false,
}: {
  req: RemovalRequest;
  post?: RemovalPostRef;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<null | "review" | "remove">(null);
  const open = req.status === "open";
  const run = useAdminAction();

  async function decide(status: "reviewed" | "actioned", actionOnPost: "none" | "remove") {
    setBusy(actionOnPost === "remove" ? "remove" : "review");
    const removing = actionOnPost === "remove";
    const data = await run({
      path: `/api/removal-requests/${req.id}`,
      init: { method: "POST", body: JSON.stringify({ status, actionOnPost }) },
      busy: removing ? "পোস্ট সরানো হচ্ছে…" : "রিমুভাল রিকোয়েস্ট বন্ধ হচ্ছে…",
      success: removing ? "✓ পোস্ট সরানো হয়েছে" : "✓ রিকোয়েস্ট সম্পন্ন হিসেবে চিহ্নিত",
    });
    setBusy(null);
    if (data) setTimeout(() => window.location.reload(), 500);
  }

  const thumb = post?.mediaPath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={post.mediaPath}
      alt=""
      loading="lazy"
      className="h-12 w-[74px] shrink-0 border border-ink/20 bg-paper object-cover"
    />
  ) : (
    <span className="flex h-12 w-[74px] shrink-0 items-center justify-center border border-dashed border-ink/25 text-[9px] font-bold text-ink-soft">
      ছবি নেই
    </span>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 bg-paper-deep px-3 py-2.5 hover:bg-paper">
        {thumb}
        <div className="min-w-[180px] flex-1">
          {post ? (
            <Link href={`/post/${post.slug}`} className="block truncate text-[13px] font-bold text-ink hover:text-alizarin">
              {post.title}
            </Link>
          ) : (
            <span className="text-[13px] font-bold text-ink-soft">(পোস্ট দেখা যায়নি)</span>
          )}
          <p className="truncate text-[11px] text-ink-soft">{req.reason ?? "কারণ লেখা হয়নি"}</p>
          <p className="font-mono-x text-[9.5px] text-ink-soft/70">
            {req.reporter_email ?? "ইমেইল নেই"} · {new Date(req.created_at).toLocaleString("bn-BD")}
          </p>
        </div>
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ink-soft">{req.status}</span>
        {open && (
          <span className="flex items-center gap-1.5">
            <button onClick={() => decide("reviewed", "none")} disabled={busy !== null} className="border border-cat-teal bg-cat-teal/15 px-2.5 py-1 text-[11px] font-bold text-ink disabled:opacity-50">
              {busy === "review" ? <Loader2 size={11} className="animate-spin" /> : "রাখুন"}
            </button>
            <button onClick={() => decide("actioned", "remove")} disabled={busy !== null} className="border border-alizarin px-2.5 py-1 text-[11px] font-bold text-alizarin hover:bg-alizarin hover:text-paper disabled:opacity-50">
              {busy === "remove" ? <Loader2 size={11} className="animate-spin" /> : "সরান"}
            </button>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="border border-ink/20 bg-paper-deep p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {thumb}
          <div className="min-w-0">
          {post ? (
            <Link href={`/post/${post.slug}`} className="text-[14px] font-bold text-ink hover:text-alizarin">
              {post.title}
            </Link>
          ) : (
            <span className="text-[14px] font-bold text-ink-soft">(পোস্ট দেখা যায়নি)</span>
          )}
            <p className="mt-1 text-[12px] text-ink-soft">
              {req.reporter_email ?? "no email"} · {new Date(req.created_at).toLocaleString("bn-BD")}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {req.status}
        </span>
      </div>
      {req.reason && <p className="mt-2 border-l-2 border-alizarin/40 pl-3 text-[12.5px] text-ink-soft">{req.reason}</p>}
      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => decide("reviewed", "none")} disabled={busy !== null} className="border-2 border-ink bg-cat-teal px-4 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50">
            {busy !== null ? (
              <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> চলছে…</span>
            ) : (
              "রিভিউড (রাখুন)"
            )}
          </button>
          <button onClick={() => decide("actioned", "remove")} disabled={busy !== null} className="border-2 border-ink bg-alizarin px-4 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50">
            {busy !== null ? (
              <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> চলছে…</span>
            ) : (
              "পোস্ট সরান (remove)"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import type { RemovalRequest } from "@hoichoi/shared-types";
import Link from "next/link";

export function RemovalRow({ req, post }: { req: RemovalRequest; post?: { slug: string; title: string } }) {
  const [busy, setBusy] = useState<null | "review" | "remove">(null);
  const open = req.status === "open";

  function refresh() {
    window.location.reload();
  }

  async function decide(status: "reviewed" | "actioned", actionOnPost: "none" | "remove") {
    setBusy(actionOnPost === "remove" ? "remove" : "review");
    try {
      await fetch(`/api/removal-requests/${req.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, actionOnPost }),
      });
      refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border border-ink/20 bg-paper-deep p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {req.status}
        </span>
      </div>
      {req.reason && <p className="mt-2 border-l-2 border-alizarin/40 pl-3 text-[12.5px] text-ink-soft">{req.reason}</p>}
      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => decide("reviewed", "none")} disabled={busy !== null} className="border-2 border-ink bg-cat-teal px-4 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50">
            রিভিউড (রাখুন)
          </button>
          <button onClick={() => decide("actioned", "remove")} disabled={busy !== null} className="border-2 border-ink bg-alizarin px-4 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50">
            পোস্ট সরান (remove)
          </button>
        </div>
      )}
    </div>
  );
}
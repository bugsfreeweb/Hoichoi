"use client";

import { useState } from "react";
import type { SubmittedPage } from "@hoichoi/shared-types";
import { ExternalLink } from "./ExternalLink";

export function SubmissionRow({ sub }: { sub: SubmittedPage }) {
  const [busy, setBusy] = useState<null | "accept" | "reject">(null);
  const [category, setCategory] = useState<string>(sub.category ?? "missing-children");

  async function decide(decision: "accept" | "reject") {
    setBusy(decision);
    try {
      await fetch(`/api/submissions/${sub.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, category }),
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  const open = sub.status === "new" || sub.status === "reviewing";

  return (
    <div className="border border-ink/20 bg-paper-deep p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <ExternalLink href={sub.page_url} className="truncate text-[14px] font-bold text-ink hover:text-alizarin">
            {sub.page_name ?? sub.page_url}
          </ExternalLink>
          <p className="truncate font-mono-x text-[11px] text-ink-soft">{sub.page_url}</p>
          <p className="mt-1 text-[11.5px] text-ink-soft">
            {sub.submitter_name ? `${sub.submitter_name} · ` : ""}
            {sub.submitter_email ?? "no email"} · {new Date(sub.created_at).toLocaleString("bn-BD")}
          </p>
        </div>
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {sub.status}
        </span>
      </div>
      {sub.notes && <p className="mt-2 border-l-2 border-ink/20 pl-3 text-[12.5px] text-ink-soft">{sub.notes}</p>}
      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select className="border border-ink/30 bg-paper px-2 py-1.5 text-[12px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="child-sexual-abuse">শিশু যৌন নির্যাতন</option>
            <option value="extramarital-crime">বৈবাহিক অপরাধ</option>
            <option value="missing-children">নিখোঁজ শিশু</option>
          </select>
          <button onClick={() => decide("accept")} disabled={busy !== null} className="border-2 border-ink bg-cat-teal px-4 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50">
            সোর্স হিসেবে গ্রহণ
          </button>
          <button onClick={() => decide("reject")} disabled={busy !== null} className="border-2 border-ink bg-alizarin px-4 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50">
            প্রত্যাখ্যান
          </button>
        </div>
      )}
    </div>
  );
}
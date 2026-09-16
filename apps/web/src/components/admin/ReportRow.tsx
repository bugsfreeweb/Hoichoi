"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReaderReportWithPost } from "@hoichoi/shared-types";
import { REPORT_STATUS_LABELS, REPORT_REASON_LABELS } from "@/lib/report-reasons";

export function ReportRow({ report }: { report: ReaderReportWithPost }) {
  const [busy, setBusy] = useState<null | "reviewed" | "dismissed">(null);
  const open = report.status === "open";

  async function decide(action: "reviewed" | "dismissed") {
    setBusy(action);
    try {
      await fetch(`/api/reports`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: report.id, action }),
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  const reasonLabel =
    REPORT_REASON_LABELS[report.reason as keyof typeof REPORT_REASON_LABELS] ?? report.reason;

  return (
    <div className="border border-ink/20 bg-paper-deep p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {report.postSlug ? (
            <Link href={`/post/${report.postSlug}`} className="text-[14px] font-bold text-ink hover:text-alizarin">
              {report.postTitle ?? "(শিরোনাম নেই)"}
            </Link>
          ) : (
            <span className="text-[14px] font-bold text-ink-soft">(পোস্ট দেখা যায়নি)</span>
          )}
          <p className="mt-1 text-[12px] text-ink-soft">
            {report.reporter_name}
            {report.reporter_email ? ` · ${report.reporter_email}` : ""} ·{" "}
            {new Date(report.created_at).toLocaleString("bn-BD")}
          </p>
        </div>
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {REPORT_STATUS_LABELS[report.status] ?? report.status}
        </span>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="rounded bg-alizarin/15 px-2 py-0.5 text-[11px] font-bold text-alizarin-deep">
          {reasonLabel}
        </span>
        {report.postCategory && <span className="font-mono-x text-[10px] tracking-wide text-ink-soft">{report.postCategory}</span>}
      </p>
      {report.details && (
        <p className="mt-2 border-l-2 border-alizarin/40 pl-3 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
          {report.details}
        </p>
      )}
      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => decide("reviewed")}
            disabled={busy !== null}
            className="border-2 border-ink bg-cat-teal px-4 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50"
          >
            পর্যালোচিত (কোনো পদক্ষেপ নয়)
          </button>
          <button
            onClick={() => decide("dismissed")}
            disabled={busy !== null}
            className="border-2 border-ink bg-paper px-4 py-1.5 text-[12px] font-bold text-ink hover:bg-alizarin hover:text-paper disabled:opacity-50"
          >
            খারিজ করুন
          </button>
        </div>
      )}
    </div>
  );
}
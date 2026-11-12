"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAction } from "@/lib/admin-api";
import Link from "next/link";
import type { ReaderReportWithPost } from "@hoichoi/shared-types";
import { REPORT_STATUS_LABELS, REPORT_REASON_LABELS } from "@/lib/report-reasons";
import { mediaUrl } from "@/lib/media";

export function ReportRow({ report, compact = false }: { report: ReaderReportWithPost; compact?: boolean }) {
  const [busy, setBusy] = useState<null | "reviewed" | "dismissed">(null);
  const open = report.status === "open";
  const run = useAdminAction();

  async function decide(action: "reviewed" | "dismissed") {
    setBusy(action);
    const data = await run({
      path: `/api/reports`,
      init: { method: "PATCH", body: JSON.stringify({ id: report.id, action }) },
      busy: action === "reviewed" ? "রিপোর্ট পর্যালোচিত করা হচ্ছে…" : "রিপোর্ট বাতিল করা হচ্ছে…",
      success: action === "reviewed" ? "✓ রিপোর্ট পর্যালোচিত" : "✓ রিপোর্ট বাতিল",
    });
    setBusy(null);
    if (data) setTimeout(() => window.location.reload(), 500);
  }

  const reasonLabel =
    REPORT_REASON_LABELS[report.reason as keyof typeof REPORT_REASON_LABELS] ?? report.reason;

  const thumbSrc = report.postMediaPath
    ? mediaUrl({ media_path: report.postMediaPath, media_kind: report.postMediaKind ?? "image" } as never)
    : null;
  const thumb = thumbSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbSrc}
      alt=""
      loading="lazy"
      className={`${compact ? "h-12 w-[74px]" : "h-16 w-28"} shrink-0 border border-ink/20 bg-paper object-cover`}
    />
  ) : (
    <span
      className={`${compact ? "h-12 w-[74px]" : "h-16 w-28"} flex shrink-0 items-center justify-center border border-dashed border-ink/25 text-[9px] font-bold text-ink-soft`}
    >
      ছবি নেই
    </span>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 bg-paper-deep px-3 py-2.5 hover:bg-paper">
        {thumb}
        <div className="min-w-[180px] flex-1">
          {report.postSlug ? (
            <Link href={`/post/${report.postSlug}`} className="block truncate text-[13px] font-bold text-ink hover:text-alizarin">
              {report.postTitle ?? "(শিরোনাম নেই)"}
            </Link>
          ) : (
            <span className="text-[13px] font-bold text-ink-soft">(পোস্ট দেখা যায়নি)</span>
          )}
          <p className="truncate text-[11px] text-ink-soft">
            <span className="font-bold text-alizarin-deep">{reasonLabel}</span>
            {report.details ? ` · ${report.details}` : ""}
          </p>
          <p className="font-mono-x text-[9.5px] text-ink-soft/70">
            {report.reporter_name} · {new Date(report.created_at).toLocaleString("bn-BD")}
          </p>
        </div>
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
          {REPORT_STATUS_LABELS[report.status] ?? report.status}
        </span>
        {open && (
          <span className="flex items-center gap-1.5">
            <button onClick={() => decide("reviewed")} disabled={busy !== null} className="border border-cat-teal bg-cat-teal/15 px-2.5 py-1 text-[11px] font-bold text-ink disabled:opacity-50">
              {busy === "reviewed" ? <Loader2 size={11} className="animate-spin" /> : "পর্যালোচিত"}
            </button>
            <button onClick={() => decide("dismissed")} disabled={busy !== null} className="border border-ink/30 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-alizarin hover:text-paper disabled:opacity-50">
              {busy === "dismissed" ? <Loader2 size={11} className="animate-spin" /> : "খারিজ"}
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
            {busy !== null ? (
              <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> চলছে…</span>
            ) : (
              "পর্যালোচিত (কোনো পদক্ষেপ নয়)"
            )}
          </button>
          <button
            onClick={() => decide("dismissed")}
            disabled={busy !== null}
            className="border-2 border-ink bg-paper px-4 py-1.5 text-[12px] font-bold text-ink hover:bg-alizarin hover:text-paper disabled:opacity-50"
          >
            {busy !== null ? (
              <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> চলছে…</span>
            ) : (
              "খারিজ করুন"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
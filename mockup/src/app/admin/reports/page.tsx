import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Flag, LayoutDashboard, MessageSquare, AppWindow, Newspaper } from "lucide-react";
import { ensureReady } from "@/lib/db-bootstrap";
import Logo from "@/components/logo";
import { getReports } from "@/lib/data";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, type ReportReason, type ReportStatus } from "@/lib/moderation-types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "রিপোর্ট — হৈচৈ অ্যাডমিন" };

export const dynamic = "force-dynamic";

/** Tailwind colour per report status (labels come from the shared constants). */
const STATUS_STYLE: Record<string, string> = {
  open: "border-amberx/30 text-amberx",
  reviewed: "border-lime/30 text-lime",
  dismissed: "border-white/10 text-white/40",
};

export default async function ReportsAdmin() {
  await ensureReady();
  const reports = await getReports();

  return (
    <main className="min-h-screen bg-night px-4 py-8 text-paper md:px-6">
      <div className="mx-auto flex max-w-[1500px] items-start gap-6">
        <aside className="sticky top-16 hidden w-56 shrink-0 rounded-2xl border border-white/10 bg-panel p-4 lg:block">
          <div className="border-b border-white/10 px-2 pb-6 pt-2">
            <Logo href="/admin" invert size="md" />
            <p className="mt-3 font-mono-x text-[9px] tracking-widest text-white/40">EDITORIAL WORKSPACE</p>
          </div>
          <nav className="my-5 space-y-2">
            <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><LayoutDashboard size={15} />ড্যাশবোর্ড</Link>
            <Link href="/admin/comments" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><MessageSquare size={15} />মন্তব্য মডারেশন</Link>
            <Link href="/admin/reports" aria-current="page" className="flex items-center gap-3 rounded-lg bg-lime px-3 py-3 text-sm font-semibold text-night"><Flag size={15} />রিপোর্ট</Link>
            <Link href="/desk" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><AppWindow size={15} />ডেস্কটপ অ্যাপ</Link>
            <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><Newspaper size={15} />পাবলিক সাইট<ArrowUpRight size={12} className="ml-auto" /></Link>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2 text-xs text-white/50 hover:text-white"><ArrowLeft size={13} />ড্যাশবোর্ডে ফিরুন</Link>
            <span className="font-mono-x text-[9px] tracking-wider text-white/35">ADMIN / REPORTS</span>
          </div>
          <h1 className="flex items-center gap-3 font-serif-bn text-[28px] font-black text-white"><Flag size={24} className="text-amberx" />প্রতিবেদন রিপোর্ট</h1>
          <p className="mt-2 text-sm text-white/50">পাঠকদের কাছ থেকে প্রাপ্ত রিপোর্ট। প্রতিটি রিপোর্টে রিপোর্টকারীর নাম, ইমেইল ও কারণ দেওয়া আছে।</p>

          <div className="mt-6 space-y-3">
            {reports.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-panel/60 p-10 text-center text-sm text-white/40">
                কোনো রিপোর্ট জমা পড়েনি।
              </div>
            )}
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-panel/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amberx/15 text-amberx"><Flag size={15} /></span>
                    <div>
                      <p className="text-sm font-semibold text-white">{r.reporterName}</p>
                      <p className="text-xs text-white/40">{r.reporterEmail}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 font-mono-x text-[9px] tracking-wider uppercase ${STATUS_STYLE[r.status] || "border-white/10 text-white/40"}`}>{REPORT_STATUS_LABELS[r.status] ?? r.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/70">{REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}</span>
                  <span className="text-xs text-white/30">· প্রতিবেদন #{r.articleId}</span>
                </div>
                {r.details && <p className="mt-3 text-sm leading-relaxed text-white/60">{r.details}</p>}
                <p className="mt-3 text-xs text-white/30">{new Date(r.createdAt).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" })}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminUser } from "@hoichoi/shared-types";
import { adminLogout } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { QueueCountsProvider, useQueueCounts, useQueueCountsPolling } from "@/components/admin/queue-counts";

function toBn(v: number): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

/**
 * Which queue count each nav row carries. `key` matches the field the
 * notifications endpoint returns, so the sidebar and the header bell read from
 * the same single COUNT query instead of each counting independently.
 */
type CountKey =
  | "pending_review"
  | "approved"
  | "new_submissions"
  | "open_removals"
  | "open_reports";

const NAV: Array<{
  href: string;
  emoji: string;
  label: string;
  /** Summed into one badge, so a two-stage queue reads as the total waiting. */
  countKeys?: CountKey[];
}> = [
  { href: "/admin", emoji: "📊", label: "ড্যাশবোর্ড" },
  { href: "/admin/sources", emoji: "📡", label: "সোর্স" },
  { href: "/admin/categories", emoji: "🗂️", label: "বিভাগ" },
  {
    href: "/admin/moderation",
    emoji: "✅",
    label: "মডারেশন কিউ",
    // Both gates: an item waiting on the second approval is still an item an
    // operator has to act on, so showing only the first gate under-reports.
    countKeys: ["pending_review", "approved"],
  },
  { href: "/admin/posts", emoji: "✏️", label: "পোস্ট এডিটর" },
  { href: "/admin/providers", emoji: "🤖", label: "AI প্রোভাইডার" },
  { href: "/admin/notices", emoji: "📢", label: "নোটিশ" },
  { href: "/admin/submissions", emoji: "📥", label: "সাবমিশন", countKeys: ["new_submissions"] },
  { href: "/admin/removals", emoji: "⚠️", label: "রিমুভাল রিকোয়েস্ট", countKeys: ["open_removals"] },
  { href: "/admin/reports", emoji: "🚩", label: "পাঠকের রিপোর্ট", countKeys: ["open_reports"] },
  { href: "/admin/archive", emoji: "📁", label: "আর্কাইভ" },
  { href: "/admin/backup", emoji: "💾", label: "ব্যাকআপ ও রিসেট" },
  { href: "/admin/logs", emoji: "📜", label: "লগ" },
  { href: "/admin/setup", emoji: "🔑", label: "সেটআপ গাইড" },
  { href: "/admin/settings", emoji: "⚙️", label: "সেটিংস" },
];

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  // Polled once here so the sidebar badges and the header bell read from the
  // same numbers rather than each counting separately.
  const counts = useQueueCountsPolling();

  return (
    <QueueCountsProvider value={counts}>
      <AdminChrome user={user}>{children}</AdminChrome>
    </QueueCountsProvider>
  );
}

function AdminChrome({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const path = usePathname();
  const { counts } = useQueueCounts();

  return (
    <main className="admin-console bg-night-grid min-h-screen pb-16 text-[#e9e6da]">
      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#050608]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[15px] font-black text-white">
              হ
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] leading-tight font-bold text-white">
                হৈচৈ কন্ট্রোল
              </p>
              <p className="font-mono-x text-[8.5px] tracking-[0.2em] text-white/35 uppercase">
                WEB TWIN · DESK IS PRIMARY
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/"
              className="hidden font-mono-x text-[9.5px] tracking-[0.16em] text-white/40 uppercase transition-colors hover:text-white sm:inline"
            >
              পাবলিক সাইট ↘
            </Link>
            <ThemeToggle />
            <NotificationBell />
            <form action={adminLogout}>
              <button
                type="submit"
                className="rounded-lg border border-alizarin/40 px-3 py-1.5 text-[10.5px] font-bold text-alizarin transition-colors hover:bg-alizarin hover:text-white"
              >
                লগআউট
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 pt-6 md:px-6">
        {/* ============ SIDEBAR ============ */}
        <aside className="sticky top-20 hidden h-[calc(100vh-6.5rem)] w-60 shrink-0 flex-col rounded-2xl border border-white/8 bg-panel/60 p-4 lg:flex">
          <div className="flex items-center gap-3 border-b border-white/8 px-2 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[17px] font-black text-white">
              হ
            </span>
            <div>
              <p className="text-[14px] leading-tight font-bold text-white">
                হৈচৈ কন্ট্রোল
              </p>
              <p className="font-mono-x text-[8.5px] tracking-[0.2em] text-white/35 uppercase">
                WEB TWIN · DESK IS PRIMARY
              </p>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            <Link href="/admin/notices" className="mb-3 flex items-center justify-between rounded-lg border border-lime/30 bg-lime/10 px-3 py-3 text-[13px] font-bold text-lime transition-colors hover:bg-lime/15">নোটিশ ও ঘোষণা <span>↗</span></Link>
            <Link href="/admin/moderation" className="mb-3 flex items-center justify-between rounded-lg border border-lime/30 bg-lime/10 px-3 py-3 text-[13px] font-bold text-lime transition-colors hover:bg-lime/15">মন্তব্য মডারেশন <span>↗</span></Link>
            <ul className="space-y-0.5 font-sans-bn text-[12.5px] font-medium">
              {NAV.map((n) => {
                const active = path === n.href || path.startsWith(`${n.href}/`);
                const badge = n.countKeys?.reduce((sum, k) => sum + (counts[k] ?? 0), 0) ?? 0;
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                        active
                          ? "bg-white text-night"
                          : "text-white/55 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <span className="text-[14px]">{n.emoji}</span>
                      <span className="flex-1">{n.label}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-alizarin px-1.5 py-0.5 font-mono-x text-[9px] font-bold text-white">
                          {toBn(badge)}
                        </span>
                      )}
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-alizarin" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.04] p-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold text-white/85">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              ভল্ট সিলড
            </p>
            <p className="mt-2 font-mono-x text-[9px] leading-relaxed tracking-wide text-white/40">
              KEYS ENCRYPTED · AES-256 MASTER KEY DESKTOP ENV-এ · রিপোতে কখনো না
            </p>
          </div>

          <div className="mt-4 border-t border-white/8 pt-3">
            <div className="flex items-center gap-1.5 px-1 text-[10.5px] text-white/70">
              <span className="cat-dot bg-lime"></span>
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
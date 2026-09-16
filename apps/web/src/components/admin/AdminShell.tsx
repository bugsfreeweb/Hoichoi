"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminUser } from "@hoichoi/shared-types";
import { adminLogout } from "@/lib/auth-actions";

const NAV: Array<{ href: string; emoji: string; label: string }> = [
  { href: "/admin", emoji: "📊", label: "ড্যাশবোর্ড" },
  { href: "/admin/sources", emoji: "📡", label: "সোর্স" },
  { href: "/admin/moderation", emoji: "✅", label: "মডারেশন কিউ" },
  { href: "/admin/posts", emoji: "✏️", label: "পোস্ট এডিটর" },
  { href: "/admin/providers", emoji: "🤖", label: "AI প্রোভাইডার" },
  { href: "/admin/submissions", emoji: "📥", label: "সাবমিশন" },
  { href: "/admin/removals", emoji: "⚠️", label: "রিমুভাল রিকোয়েস্ট" },
  { href: "/admin/reports", emoji: "🚩", label: "পাঠকের রিপোর্ট" },
  { href: "/admin/archive", emoji: "📁", label: "আর্কাইভ" },
  { href: "/admin/backup", emoji: "💾", label: "ব্যাকআপ ও রিসেট" },
  { href: "/admin/logs", emoji: "📜", label: "লগ" },
  { href: "/admin/settings", emoji: "⚙️", label: "সেটিংস" },
];

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const path = usePathname();

  return (
    <main className="admin-console bg-night-grid min-h-screen pb-16 text-[#e9e6da]">
      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 pt-8 md:px-6">
        {/* ============ SIDEBAR ============ */}
        <aside className="sticky top-16 hidden h-[calc(100vh-6.5rem)] w-60 shrink-0 flex-col rounded-2xl border border-white/8 bg-panel/60 p-4 lg:flex">
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
            <Link href="/admin/moderation" className="mb-3 flex items-center justify-between rounded-lg border border-lime/30 bg-lime/10 px-3 py-3 text-[13px] font-bold text-lime transition-colors hover:bg-lime/15">মন্তব্য মডারেশন <span>↗</span></Link>
            <ul className="space-y-0.5 font-sans-bn text-[12.5px] font-medium">
              {NAV.map((n) => {
                const active = path === n.href || path.startsWith(`${n.href}/`);
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
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-alizarin" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Link
            href="/desk"
            className="mt-4 flex items-center gap-2 rounded-xl bg-lime px-3 py-2.5 text-[12px] font-bold text-night transition-all hover:brightness-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/></svg>
            ডেস্কটপ অ্যাপ খুলুন
          </Link>

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
            <div className="mt-2 flex items-center justify-between px-1">
              <Link
                href="/"
                className="font-mono-x text-[9.5px] tracking-[0.16em] text-white/40 uppercase transition-colors hover:text-white"
              >
                পাবলিক সাইট ↘
              </Link>
              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}

function LogoutButton() {
  return (
    <form action={adminLogout}>
      <button className="font-mono-x text-[9.5px] tracking-[0.16em] text-alizarin uppercase transition-colors hover:text-white">
        লগআউট
      </button>
    </form>
  );
}
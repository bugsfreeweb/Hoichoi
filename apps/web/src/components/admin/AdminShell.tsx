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
  { href: "/admin/archive", emoji: "📁", label: "আর্কাইভ" },
  { href: "/admin/backup", emoji: "💾", label: "ব্যাকআপ ও রিসেট" },
  { href: "/admin/logs", emoji: "📜", label: "লগ" },
  { href: "/admin/settings", emoji: "⚙️", label: "সেটিংস" },
];

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="admin-console min-h-dvh">
      <header className="sticky top-0 z-[60] flex h-12 items-center justify-between border-b border-white/10 bg-[#0a0d12] px-5 text-paper/85">
        <div className="flex items-center gap-2.5 font-mono-x text-[10px] tracking-[0.22em] uppercase">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alizarin opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-alizarin"></span>
          </span>
          HOICHOI · ADMIN CONSOLE
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-full px-3 py-1 text-[11.5px] font-medium text-white/55 hover:bg-white/10 hover:text-white"
          >
            পাবলিক সাইট
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium text-white/70 sm:flex">
            <span className="cat-dot bg-lime"></span> {user.email}
          </span>
          <LogoutButton />
        </nav>
      </header>

      <div className="flex min-h-[calc(100dvh-3rem)]">
        <aside className="w-[218px] shrink-0 border-r border-white/10 bg-[#0a0d12] py-6">
          <div className="px-5">
            <p className="font-mono-x text-[9.5px] tracking-[0.24em] text-white/35 uppercase">ADMIN</p>
            <div className="mt-3 flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[17px] font-black text-white">
                হ
              </span>
              <div>
                <p className="text-[13px] leading-tight font-bold text-white">হইচই কন্ট্রো</p>
                <p className="font-mono-x text-[8.5px] tracking-[0.16em] text-white/35 uppercase">LIVE CONSOLE</p>
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-0.5 px-3 font-sans-bn text-[13px] font-medium">
            {NAV.map((n) => {
              const active = path === n.href || path.startsWith(`${n.href}/`);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                      active
                        ? "bg-white text-night"
                        : "text-white/55 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="text-[14px]">{n.emoji}</span>
                    <span className="flex-1">{n.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-lime" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 border-t border-white/10 px-5 pt-4">
            <p className="font-mono-x text-[8.5px] tracking-[0.18em] text-lime uppercase">● CONTROLLER ONLINE</p>
            <p className="mt-1 text-[10px] text-white/35">TURSO · VERCEL · EDGE</p>
          </div>
        </aside>

        <main className="flex-1 px-8 py-6 pb-24">{children}</main>
      </div>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action={adminLogout}>
      <button className="rounded-full px-3 py-1 text-[11.5px] font-medium text-white/55 transition-colors hover:bg-alizarin hover:text-white">
        লগআউট
      </button>
    </form>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, AppWindow, TerminalSquare, Network, GitBranch, FileCode2 } from "lucide-react";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { href: "/", label: "পাবলিক সাইট", icon: Newspaper },
  { href: "/desk", label: "ডেস্কটপ অ্যাপ", icon: AppWindow },
  { href: "/option-a", label: "Option-A Pure", icon: FileCode2 },
  { href: "/admin", label: "ওয়েব অ্যাডমিন", icon: TerminalSquare },
  { href: "/system", label: "ব্লুপ্রিন্ট", icon: Network },
];

export default function ModeChrome() {
  const pathname = usePathname();
  if (pathname.startsWith("/desk")) return null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60] h-10 border-b border-white/10 bg-[#0a0c10] text-[#f3eee1]/85">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-2.5 font-mono-x text-[10px] tracking-[0.22em] uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alizarin opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-alizarin" />
            </span>
            {BRAND.en} <span className="hidden text-white/35 sm:inline">·</span>
            <span className="hidden text-white/35 sm:inline">TAURI DESK · OPTION A</span>
          </div>

          <nav className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-all duration-300 ${
                    active
                      ? "bg-alizarin text-[#f3eee1]"
                      : "text-white/55 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={12.5} strokeWidth={2.2} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 font-mono-x text-[10px] tracking-[0.18em] text-white/35 uppercase md:flex">
            <GitBranch size={11} />
            <span>→</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 3l10 18H2L12 3z" />
            </svg>
            <span className="text-white/50">AUTO-SHIP · EVERY 2H</span>
          </div>
        </div>
      </header>
      <div className="h-10" />
    </>
  );
}

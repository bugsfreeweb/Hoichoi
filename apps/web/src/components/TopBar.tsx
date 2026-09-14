import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function TopBar() {
  return (
    <header className="sticky top-0 z-[60] h-10 border-b border-white/10 bg-night text-white/85">
      <div className="mx-auto flex h-full max-w-site items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-mono-x text-[10px] tracking-[0.22em] uppercase">
          <img src="/logo.png" alt="" className="h-5 w-5 rounded-sm object-cover" />
          HOICHOI <span className="hidden text-white/35 sm:inline">·</span>
          <span className="hidden text-white/35 sm:inline">AUTO-CURATED NEWS DESK</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-alizarin px-3 py-1 text-[11.5px] font-medium text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="10" y="6" rx="1"/></svg>
            পাবলিক সাইট
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium text-white/55 hover:bg-white/10 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
            অ্যাডমিন কনসোল
          </Link>
          <Link
            href="/system"
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium text-white/55 hover:bg-white/10 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 6 4-4 4 4"/><path d="M12 2v14"/><path d="M9 18a3 3 0 0 1 6 0"/><path d="M12 14v4"/></svg>
            ব্লুপ্রিন্ট
          </Link>
          <ThemeToggle />
        </nav>
        <div className="hidden items-center gap-2 font-mono-x text-[10px] tracking-[0.18em] text-white/35 uppercase md:flex">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6a9 9 0 0 0-9 9V3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/></svg>
          <span>→</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 18H2L12 3z"/></svg>
          <span className="text-white/50">AUTO-SHIP · EVERY 2H</span>
        </div>
      </div>
    </header>
  );
}
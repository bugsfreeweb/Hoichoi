import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-[60] h-10 border-b border-white/10 bg-ink text-paper/85">
      <div className="mx-auto flex h-full max-w-site items-center justify-between px-4">
        <div className="flex items-center gap-2.5 font-mono-x text-[10px] tracking-[0.22em] uppercase">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alizarin opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-alizarin"></span>
          </span>
          HOICHOI <span className="hidden text-white/35 sm:inline">·</span>
          <span className="hidden text-white/35 sm:inline">AUTO-CURATED NEWS DESK</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-alizarin px-3 py-1 text-[11.5px] font-medium text-paper"
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
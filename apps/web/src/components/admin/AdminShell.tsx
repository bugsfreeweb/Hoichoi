import Link from "next/link";
import type { AdminUser } from "@hoichoi/shared-types";

const NAV: Array<{ href: string; emoji: string; label: string }> = [
  { href: "/admin", emoji: "📊", label: "ড্যাশবোর্ড" },
  { href: "/admin/sources", emoji: "📡", label: "সোর্স" },
  { href: "/admin/moderation", emoji: "✅", label: "মডারেশন কিউ" },
  { href: "/admin/providers", emoji: "🤖", label: "AI প্রোভাইডার" },
  { href: "/admin/submissions", emoji: "📥", label: "সাবমিশন" },
  { href: "/admin/removals", emoji: "⚠️", label: "রিমুভাল রিকোয়েস্ট" },
  { href: "/admin/archive", emoji: "📁", label: "আর্কাইভ" },
  { href: "/admin/logs", emoji: "📜", label: "লগ" },
  { href: "/admin/settings", emoji: "⚙️", label: "সেটিংস" },
];

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  return (
    <div className="page-chrome">
      <header className="sticky top-0 z-[60] flex h-11 items-center justify-between border-b border-white/10 bg-ink px-4 text-paper/85">
        <div className="flex items-center gap-2.5 font-mono-x text-[10px] tracking-[0.22em] uppercase">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alizarin opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-alizarin"></span>
          </span>
          HOICHOI · ADMIN CONSOLE
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/" className="rounded-full px-3 py-1 text-[11.5px] font-medium text-white/55 hover:bg-white/10">
            পাবলিক সাইট
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium text-white/70 sm:flex">
            <span className="cat-dot bg-lime"></span> {user.email}
          </span>
          <LogoutButton />
        </nav>
      </header>

      <div className="flex min-h-screen">
        <aside className="w-[200px] shrink-0 border-r border-ink/15 bg-paper-deep py-6">
          <p className="px-5 font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">ADMIN</p>
          <ul className="mt-4 font-sans-bn text-[13.5px] font-medium">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="flex items-center gap-2 px-5 py-2.5 text-ink-soft transition-colors hover:bg-paper hover:text-ink"
                >
                  <span>{n.emoji}</span>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <main className="flex-1 px-8 py-6 pb-24">{children}</main>
      </div>
    </div>
  );
}

function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { destroySession } = await import("@/lib/auth");
        await destroySession();
        const { redirect } = await import("next/navigation");
        redirect("/admin/login");
      }}
    >
      <button className="rounded-full px-3 py-1 text-[11.5px] font-medium text-white/55 transition-colors hover:bg-alizarin hover:text-paper">
        লগআউট
      </button>
    </form>
  );
}
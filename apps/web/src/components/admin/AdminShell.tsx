"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminUser, SidebarStyleId } from "@hoichoi/shared-types";
import { DEFAULT_SIDEBAR_STYLE } from "@hoichoi/shared-types";
/*
 * One DOM, twelve sidebar templates. Plain CSS (not utilities) because these are
 * twelve alternative looks of the same element — see the file header.
 */
import "./sidebar-styles.css";
import { adminLogout } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { QueueCountsProvider, useQueueCounts, useQueueCountsPolling } from "@/components/admin/queue-counts";
import { SITE_BUILD } from "@/lib/build";
import { ToastProvider } from "@/components/admin/ui/toast";
import { SystemStatusBar } from "@/components/admin/ui/SystemStatusBar";

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
  | "open_reports"
  | "pending_comments";

interface NavItem {
  href: string;
  emoji: string;
  label: string;
  /** Summed into one badge, so a two-stage queue reads as the total waiting. */
  countKeys?: CountKey[];
}

/**
 * Nav rows grouped by operational domain. Grouping keeps the console readable
 * as the feature set grows: the eye lands on "which area" first, then the
 * specific screen, instead of scanning one 15-row list.
 */
const NAV_GROUPS: Array<{ title: string; en: string; items: NavItem[] }> = [
  {
    title: "ওভারভিউ",
    en: "Overview",
    items: [
      { href: "/admin", emoji: "📊", label: "ড্যাশবোর্ড" },
    ],
  },
  {
    title: "কনটেন্ট",
    en: "Content",
    items: [
      { href: "/admin/sources", emoji: "📡", label: "সোর্স" },
      { href: "/admin/categories", emoji: "🗂️", label: "বিভাগ" },
      { href: "/admin/posts", emoji: "✏️", label: "পোস্ট এডিটর" },
      { href: "/admin/live", emoji: "📡", label: "লাইভ ইভেন্ট" },
      { href: "/admin/notices", emoji: "📢", label: "নোটিশ" },
      { href: "/admin/ads", emoji: "📣", label: "বিজ্ঞাপন" },
      { href: "/admin/polls", emoji: "🗳️", label: "পোল" },
      { href: "/admin/archive", emoji: "📁", label: "আর্কাইভ" },
    ],
  },
  {
    title: "মডারেশন",
    en: "Moderation",
    items: [
      {
        href: "/admin/moderation",
        emoji: "✅",
        label: "কনটেন্ট মডারেশন",
        // Both gates: an item waiting on the second approval is still an item an
        // operator has to act on, so showing only the first gate under-reports.
        countKeys: ["pending_review", "approved"],
      },
      { href: "/admin/comments", emoji: "💬", label: "মন্তব্য মডারেশন", countKeys: ["pending_comments"] },
      { href: "/admin/submissions", emoji: "📥", label: "সাবমিশন", countKeys: ["new_submissions"] },
      { href: "/admin/removals", emoji: "⚠️", label: "রিমুভাল রিকোয়েস্ট", countKeys: ["open_removals"] },
      { href: "/admin/reports", emoji: "🚩", label: "পাঠকের রিপোর্ট", countKeys: ["open_reports"] },
    ],
  },
  {
    title: "সিস্টেম",
    en: "System",
    items: [
      { href: "/admin/providers", emoji: "🤖", label: "AI প্রোভাইডার" },
      { href: "/admin/media", emoji: "🗄️", label: "মিডিয়া ও কোটা" },
      { href: "/admin/backup", emoji: "💾", label: "ব্যাকআপ ও রিসেট" },
      { href: "/admin/logs", emoji: "📜", label: "লগ" },
      { href: "/admin/security", emoji: "🔐", label: "নিরাপত্তা ও ডিভাইস" },
      { href: "/admin/setup", emoji: "🔑", label: "সেটআপ গাইড" },
      { href: "/admin/settings", emoji: "⚙️", label: "সেটিংস" },
    ],
  },
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const SIDEBAR_KEY = "hoichoi-admin-sidebar-collapsed";

export function AdminShell({
  user,
  sidebarStyle = DEFAULT_SIDEBAR_STYLE,
  children,
}: {
  user: AdminUser;
  /** Admin-owned sidebar template (সেটিংস → ডিজাইন). Applied, never guessed. */
  sidebarStyle?: SidebarStyleId;
  children: React.ReactNode;
}) {
  // Polled once here so the sidebar badges and the header bell read from the
  // same numbers rather than each counting separately.
  const counts = useQueueCountsPolling();

  return (
    <QueueCountsProvider value={counts}>
      {/* Every console action reports through these toasts, so a busy request
          and a failed one never look the same as a click that did nothing. */}
      <ToastProvider>
        <AdminChrome user={user} sidebarStyle={sidebarStyle}>
          {children}
        </AdminChrome>
      </ToastProvider>
    </QueueCountsProvider>
  );
}

function AdminChrome({
  user,
  sidebarStyle,
  children,
}: {
  user: AdminUser;
  sidebarStyle: SidebarStyleId;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const { counts } = useQueueCounts();
  const footerRef = useRef<HTMLElement>(null);

  // Desktop: collapse to an icon rail. Mobile: the whole sidebar is a drawer
  // that slides over the content. The two are independent, because a laptop
  // user who prefers the rail still needs the drawer to work on a phone.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // storage may be disabled
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // `[` toggles the rail, as in most editor sidebars. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      e.preventDefault();
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);


  // Close the mobile drawer whenever the route changes, so tapping a link does
  // not leave the overlay covering the destination page.
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // The sticky footer overlaps content that scrolls beneath it, so the content
  // column reserves exactly the footer's height plus a gap. Measuring it rather
  // than hardcoding a value is what keeps that reserve correct: the footer is a
  // wrapping grid, so it is one row on a wide window and two or three on a
  // narrow one, and a fixed guess leaves content hidden again at some widths.
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty("--admin-footer-h", `${h}px`);
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div className="admin-console bg-night-grid min-h-dvh text-[#e9e6da]">
      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-50 border-b border-ink/15 bg-paper-deep/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="মেনু খুলুন"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink/20 text-ink transition hover:bg-ink/5 lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[15px] font-black text-on-accent">
              হ
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] leading-tight font-bold text-ink">হৈচৈ কন্ট্রোল</p>
              <p className="font-mono-x text-[8.5px] tracking-[0.2em] text-ink-soft uppercase">
                WEB TWIN · DESK IS PRIMARY
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/"
              className="hidden font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase transition-colors hover:text-ink sm:inline"
            >
              পাবলিক সাইট ↘
            </Link>
            <ThemeToggle />
            <NotificationBell />
            <form action={adminLogout}>
              <button
                type="submit"
                className="rounded-lg border border-alizarin/40 px-3 py-1.5 text-[10.5px] font-bold text-alizarin transition-colors hover:bg-alizarin hover:text-on-accent"
              >
                লগআউট
              </button>
            </form>
          </div>
        </div>
        {/* Live dependency health, polled every 30s — see SystemStatusBar. */}
        <SystemStatusBar />
      </header>

      {/*
        Full width. The console used to cap itself at max-w-[1500px], which left
        a wide empty gutter on large displays and made the settings and notice
        pages look half-width against the browser window. `w-full` + `min-w-0`
        on the content column: the sidebar is fixed-width, so without min-w-0
        the content column refuses to shrink below its widest child and pushes
        the page into horizontal scrolling.
      */}
      <div className="admin-console-main flex w-full gap-6 px-4 pt-6 md:px-6">
        {/* ============ SIDEBAR (desktop) ============ */}
        <aside
          data-sidebar-style={sidebarStyle}
          className={`admin-sidebar ${collapsed ? "adm-collapsed" : ""} relative sticky top-20 hidden shrink-0 flex-col rounded-2xl border border-white/8 bg-panel/60 transition-[width] duration-300 lg:flex ${
            collapsed ? "w-[70px]" : "w-60"
          }`}
        >
          {/*
            The collapse handle lives on the sidebar's own edge, not in a header
            row: it is the control for the *column*, and putting it half outside
            the panel is what makes it findable without hunting. It is 24px so it
            clears the 24x24 minimum target at the rail's narrowest width.
          */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "সাইডবার প্রসারিত করুন" : "সাইডবার সংকুচিত করুন"}
            aria-expanded={!collapsed}
            title={`${collapsed ? "প্রসারিত করুন" : "সংকুচিত করুন"} (শর্টকাট: [ )`}
            className="absolute -right-3 top-6 z-20 grid h-6 w-6 place-items-center rounded-full border border-white/15 bg-night text-white/70 shadow-lg transition hover:border-alizarin hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
          <SidebarNav variant="desktop" collapsed={collapsed} path={path} counts={counts} email={user.email} />
        </aside>

        {/* ============ SIDEBAR (mobile drawer) ============ */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              aria-label="মেনু বন্ধ করুন"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />
            <aside
              data-sidebar-style={sidebarStyle}
              className="admin-sidebar absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-white/10 bg-panel shadow-2xl"
            >
              <SidebarNav variant="mobile" collapsed={false} path={path} counts={counts} email={user.email} onClose={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        {/* ============ MAIN ============ */}
        <section className="min-w-0 flex-1">{children}</section>
      </div>

      {/* ============ STICKY FOOTER ============ */}
      <AdminFooter path={path} email={user.email} footerRef={footerRef} />
    </div>
  );
}

/**
 * Sidebar body shared by the desktop rail and the mobile drawer. `collapsed`
 * only applies on desktop; the drawer always shows full labels.
 */
function SidebarNav({
  variant,
  collapsed,
  path,
  counts,
  email,
  onClose,
}: {
  variant: "desktop" | "mobile";
  collapsed: boolean;
  path: string;
  counts: Record<CountKey, number>;
  email: string;
  onClose?: () => void;
}) {
  // A 21-screen console is searchable before it is scrollable: type a word and
  // the rail shows only the screens that match. When collapsed there is no room
  // for the field, so the search reset with the collapse.
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const groups = needle
    ? NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter(
          (n) => n.label.toLowerCase().includes(needle) || n.href.includes(needle) || g.en.toLowerCase().includes(needle),
        ),
      })).filter((g) => g.items.length > 0)
    : NAV_GROUPS;
  const nothingFound = needle.length > 0 && groups.length === 0;

  return (
    <>
      <div className={`flex items-center gap-3 border-b border-white/8 py-4 ${collapsed ? "justify-center px-1" : "px-3"}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[17px] font-black text-on-accent">
          হ
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[14px] leading-tight font-bold text-white">হৈচৈ কন্ট্রোল</p>
            <p className="font-mono-x text-[8.5px] tracking-[0.2em] text-white/35 uppercase">
              WEB TWIN · DESK IS PRIMARY
            </p>
          </div>
        ) : null}
        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}

      </div>

      {/*
        The nav is taller than any laptop viewport, so this is the one region
        that scrolls vertically. `min-h-0` lets the flex child actually shrink
        below its content size, which is what makes overflow-y engage instead of
        the aside growing past the viewport.
      */}
      {!collapsed ? (
        <div className="px-2 pt-2.5">
          <label htmlFor="admin-nav-search" className="sr-only">
            স্ক্রিন খুঁজুন
          </label>
          <div className="relative">
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="admin-nav-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="স্ক্রিন খুঁজুন…"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-7 pr-2 text-[11.5px] text-white placeholder:text-white/30 focus:border-alizarin/60 focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      <nav aria-label="কনসোল মেনু" className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1.5 pb-2">
        {nothingFound ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-white/40">
            “{query.trim()}” নামে কোনো স্ক্রিন নেই।
          </p>
        ) : null}
        {groups.map((group) => (
          <div key={group.title} className="adm-nav-group">
            {collapsed ? (
              <div className="mx-2 mb-2 border-t border-white/8" aria-hidden="true" />
            ) : (
              <p className="adm-nav-caption mb-1 px-2.5 font-mono-x text-[8.5px] tracking-[0.22em] text-white/30 uppercase">
                {group.title} · {group.en}
              </p>
            )}
            <ul className="space-y-0.5 font-sans-bn text-[12.5px] font-medium">
              {group.items.map((n) => {
                const active = path === n.href || path.startsWith(`${n.href}/`);
                const badge = n.countKeys?.reduce((sum, k) => sum + (counts[k] ?? 0), 0) ?? 0;
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? n.label : undefined}
                      title={collapsed ? n.label : undefined}
                      className={`adm-nav-link group/nav relative flex items-center gap-3 rounded-lg py-2.5 transition-all duration-300 ${
                        collapsed ? "justify-center px-2" : "px-3"
                      } ${active ? "bg-white text-night" : "text-white/55 hover:bg-white/8 hover:text-white"}`}
                    >
                      {/*
                        In the rail the label is not rendered, so the emoji
                        carries the meaning. The name is carried by `title` and
                        `aria-label` rather than a CSS hover card: the nav is a
                        scroll container, and `overflow-y: auto` clips anything
                        that escapes it horizontally, so an absolutely-positioned
                        label beside the rail was never actually shown.
                      */}
                      {active && !collapsed ? (
                        <span className="absolute -left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-alizarin" aria-hidden="true" />
                      ) : null}
                      <span className="relative text-[15px]">
                        {n.emoji}
                        {collapsed && badge > 0 ? (
                          <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-alizarin ring-2 ring-panel" />
                        ) : null}
                      </span>
                      {!collapsed ? (
                        <>
                          <span className="adm-nav-label flex-1">{n.label}</span>
                          {badge > 0 && (
                            <span className="rounded-full bg-alizarin px-1.5 py-0.5 font-mono-x text-[9px] font-bold text-on-accent">
                              {toBn(badge)}
                            </span>
                          )}
                          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-alizarin" />}
                        </>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed ? (
        <div className="mx-2 mb-3 shrink-0 rounded-xl border border-white/8 bg-white/[0.04] p-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold text-white/85">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            ভল্ট সিলড
          </p>
          <p className="mt-2 font-mono-x text-[9px] leading-relaxed tracking-wide text-white/70">
            KEYS ENCRYPTED · AES-256 MASTER KEY DESKTOP ENV-এ · রিপোতে কখনো না
          </p>
        </div>
      ) : null}

      <div className={`shrink-0 border-t border-white/8 py-3 ${collapsed ? "px-1" : "px-3"}`}>
        <div className={`flex items-center gap-1.5 text-[10.5px] text-white/70 ${collapsed ? "justify-center" : ""}`}>
          <span className="cat-dot bg-lime"></span>
          {!collapsed ? <span className="truncate">{email}</span> : null}
        </div>
      </div>
    </>
  );
}

/**
 * Compact console status bar. Pinned to the bottom edge so the build stamp and
 * the "you are here" label stay visible on long queue pages instead of only
 * being reachable by scrolling back to the top.
 */
function AdminFooter({
  path,
  email,
  footerRef,
}: {
  path: string;
  email: string;
  footerRef: React.RefObject<HTMLElement | null>;
}) {
  const active = NAV.find((n) => path === n.href || path.startsWith(`${n.href}/`));
  return (
    <footer ref={footerRef} className="admin-footer">
      {/*
        Three cells on a wrapping grid rather than justify-between on one row.
        A single row of nowrap items could not fit a narrow window, so the
        labels were pushed out of the bar and cropped; here each cell shrinks or
        wraps on its own and the bar grows vertically instead of losing content.
      */}
      <div className="grid w-full grid-cols-1 gap-x-4 gap-y-0.5 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_auto] md:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <span className="min-w-0 truncate font-mono-x text-[9.5px] tracking-[0.16em] text-white/70 uppercase">
          {active ? `${active.emoji} ${active.label}` : "হৈচৈ কন্ট্রোল"}
        </span>
        <span className="min-w-0 truncate text-[10.5px] text-white/45 sm:text-right">{email}</span>
        <span className="flex items-center gap-3 font-mono-x text-[9.5px] tracking-[0.16em] text-white/35 uppercase lg:justify-self-end">
          <span>ASIA/DHAKA</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">BUILD {SITE_BUILD}</span>
        </span>
      </div>
    </footer>
  );
}

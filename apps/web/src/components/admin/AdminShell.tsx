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
import {
  QueueCountsProvider,
  useQueueCounts,
  useQueueCountsPolling,
} from "@/components/admin/queue-counts";
import { SITE_BUILD } from "@/lib/build";
import { ToastProvider } from "@/components/admin/ui/toast";
import { SystemStatusBar } from "@/components/admin/ui/SystemStatusBar";
// One glyph vocabulary, shared with the desktop app: a screen has the same icon
// wherever an operator meets it.
import { NavIcon, type NavIconName } from "@hoichoi/icons";
import "@hoichoi/icons/styles.css";

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
  /** A name, not a glyph: the shape comes from `@hoichoi/icons`. */
  icon: NavIconName;
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
    items: [{ href: "/admin", icon: "dashboard", label: "ড্যাশবোর্ড" }],
  },
  {
    title: "কনটেন্ট",
    en: "Content",
    /**
     * One row per *area*, not per screen. Sources and categories are the same
     * job (what we fetch, where it is filed); live events, notices and polls are
     * the same job (what sits beside the feed). Each row opens a screen whose tab
     * strip reaches its siblings, so the sidebar stays short without hiding a
     * feature behind a second click that has no visible name.
     */
    items: [
      { href: "/admin/sources", icon: "sources", label: "সোর্স ও বিভাগ" },
      { href: "/admin/posts", icon: "posts", label: "পোস্ট এডিটর" },
      { href: "/admin/live", icon: "live", label: "লাইভ, নোটিশ ও পোল" },
      { href: "/admin/ads", icon: "ads", label: "বিজ্ঞাপন" },
      { href: "/admin/archive", icon: "archive", label: "আর্কাইভ" },
    ],
  },
  {
    title: "মডারেশন",
    en: "Moderation",
    items: [
      {
        href: "/admin/moderation",
        icon: "moderation",
        label: "মডারেশন",
        // Both gates and both subjects: an item waiting on the second approval is
        // still an item an operator has to act on, and a pending comment is a
        // queue nobody sees unless it is counted here.
        countKeys: ["pending_review", "approved", "pending_comments"],
      },
      {
        href: "/admin/submissions",
        icon: "submissions",
        label: "ইনবক্স ও রিপোর্ট",
        // Three inboxes, one number: whichever of them is non-empty is work.
        countKeys: ["new_submissions", "open_removals", "open_reports"],
      },
    ],
  },
  {
    title: "সিস্টেম",
    en: "System",
    items: [
      { href: "/admin/providers", icon: "providers", label: "AI প্রোভাইডার" },
      { href: "/admin/media", icon: "media", label: "মিডিয়া ও কোটা" },
      { href: "/admin/backup", icon: "backup", label: "ব্যাকআপ ও রিসেট" },
      { href: "/admin/logs", icon: "logs", label: "লগ" },
      { href: "/admin/security", icon: "security", label: "নিরাপত্তা ও ডিভাইস" },
      { href: "/admin/setup", icon: "setup", label: "সেটআপ গাইড" },
      { href: "/admin/settings", icon: "settings", label: "সেটিংস" },
    ],
  },
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Sibling screens that share one sidebar row.
 *
 * `/admin/categories` is a tab under `/admin/sources`, so matching the sidebar
 * on `href` alone left the rail with nothing highlighted — the console looked
 * like it had lost the page you were on. Every screen in a group highlights the
 * row that owns the group.
 */
const SECTION_OF: Record<string, string> = {
  "/admin/categories": "/admin/sources",
  "/admin/notices": "/admin/live",
  "/admin/polls": "/admin/live",
  "/admin/comments": "/admin/moderation",
  "/admin/removals": "/admin/submissions",
  "/admin/reports": "/admin/submissions",
};

/**
 * Does this row own the current path?
 *
 * The dashboard's href is `/admin`, which is a prefix of every console URL — so
 * a plain `startsWith` marked "ড্যাশবোর্ড" active on all twenty-one screens and
 * the row you were actually on shared the highlight. It is an exact match; every
 * other row owns its own subtree.
 */
function rowOwns(n: NavItem, here: string): boolean {
  if (n.href === "/admin") return here === "/admin";
  return here === n.href || here.startsWith(`${n.href}/`);
}

/** The sidebar row a path belongs to, or `undefined` for an unlisted page. */
function ownerHref(path: string): string {
  if (NAV.some((n) => rowOwns(n, path))) return path;
  for (const [sibling, owner] of Object.entries(SECTION_OF)) {
    if (path === sibling || path.startsWith(`${sibling}/`)) return owner;
  }
  return path;
}

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
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el?.isContentEditable
      )
        return;
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
        document.documentElement.style.setProperty(
          "--admin-footer-h",
          `${h}px`,
        );
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
    <div className="admin-console admin-shell bg-night-grid min-h-dvh text-[#e9e6da]">
      {/*
        ============ SIDEBAR (desktop) ============
        Full height, flush to the left edge: the console reads as a fixed rail
        with a working area beside it, not a floating card under a header. The
        masthead already lives in the top bar and the build stamp in the footer,
        so the rail carries navigation and nothing else.
      */}
      <aside
        data-sidebar-style={sidebarStyle}
        className={`admin-sidebar ${collapsed ? "adm-collapsed" : ""} sticky top-0 hidden h-dvh shrink-0 flex-col lg:flex ${
          collapsed ? "w-[70px]" : "w-60 xl:w-[17rem]"
        }`}
      >
        <SidebarNav
          variant="desktop"
          collapsed={collapsed}
          path={path}
          counts={counts}
          email={user.email}
          onToggle={toggleCollapsed}
        />
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
            className="admin-sidebar absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-panel shadow-2xl"
          >
            <SidebarNav
              variant="mobile"
              collapsed={false}
              path={path}
              counts={counts}
              email={user.email}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {/*
        ============ RIGHT-HAND COLUMN ============
        Header, working area and footer share the space the rail leaves. The
        body itself never scrolls sideways; `min-w-0` is what lets this column
        shrink below its widest child instead of pushing the page wide.
      */}
      <div className="admin-main-col flex min-w-0 flex-1 flex-col">
        {/* ============ TOP BAR ============ */}
        <header className="sticky top-0 z-50 border-b border-ink/15 bg-paper-deep/90 backdrop-blur">
          <div className="flex h-14 w-full items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {/*
                The drawer opener is a three-line button, the same gesture as the
                rail's own toggle: one icon means "this changes the sidebar",
                whichever sidebar the current width is showing.
              */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="মেনু খুলুন"
                aria-expanded={mobileOpen}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink/20 text-ink transition hover:bg-ink/5 lg:hidden"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[15px] font-black text-on-accent">
                হ
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] leading-tight font-bold text-ink">
                  হৈচৈ কন্ট্রোল
                </p>
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

        {/* ============ MAIN ============ */}
        <main className="admin-console-main min-w-0 flex-1 px-4 pt-6 md:px-6">
          {children}
        </main>

        {/* ============ FOOTER ============ */}
        <AdminFooter path={path} email={user.email} footerRef={footerRef} />
      </div>
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
  onToggle,
}: {
  variant: "desktop" | "mobile";
  collapsed: boolean;
  path: string;
  counts: Record<CountKey, number>;
  email: string;
  onClose?: () => void;
  /** Desktop rails only: the three-line toggle that collapses the column. */
  onToggle?: () => void;
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
          (n) =>
            n.label.toLowerCase().includes(needle) ||
            n.href.includes(needle) ||
            g.en.toLowerCase().includes(needle),
        ),
      })).filter((g) => g.items.length > 0)
    : NAV_GROUPS;
  const nothingFound = needle.length > 0 && groups.length === 0;

  return (
    <>
      {/*
        No masthead here. The console's name, its logo and the build stamp all
        live in the top bar and the footer, and repeating them inside the rail
        spent the first 70 px of the column on information the operator already
        has on every screen. What is left is the two controls that belong to the
        column itself: the three-line toggle, and (on the drawer) close.
      */}
      <div
        className={`adm-nav-head flex shrink-0 items-center border-b py-2.5 ${collapsed ? "justify-center px-1" : "justify-between px-2"}`}
      >
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={
              collapsed ? "সাইডবার প্রসারিত করুন" : "সাইডবার সংকুচিত করুন"
            }
            aria-expanded={!collapsed}
            title={`${collapsed ? "প্রসারিত করুন" : "সংকুচিত করুন"} (শর্টকাট: [ )`}
            className="adm-nav-toggle grid h-8 w-8 shrink-0 place-items-center rounded-lg transition"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        ) : null}
        {!collapsed && variant === "desktop" ? (
          <span className="adm-nav-kicker pr-1 font-mono-x text-[8px] tracking-[0.2em] uppercase">
            মেনু
          </span>
        ) : null}
        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="adm-nav-toggle ml-auto grid h-8 w-8 place-items-center rounded-lg transition"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
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
              className="adm-nav-search-icon pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
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
              className="adm-nav-search w-full rounded-lg border py-1.5 pl-7 pr-2 text-[11.5px] focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {/*
        Twenty-one screens, four groups: tight enough rows that the whole map
        fits a laptop viewport with no scrollbar showing. Where it genuinely
        cannot fit (a short window, a zoomed page) the region still scrolls —
        hidden, not removed — so nothing becomes unreachable to keep the rail
        looking tidy.
      */}
      <nav
        aria-label="কনসোল মেনু"
        className="adm-nav mt-2 min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-1.5 pb-2"
      >
        {nothingFound ? (
          <p className="adm-nav-empty px-3 py-6 text-center text-[11px] leading-relaxed">
            “{query.trim()}” নামে কোনো স্ক্রিন নেই।
          </p>
        ) : null}
        {groups.map((group) => (
          <div key={group.title} className="adm-nav-group">
            {collapsed ? (
              <div
                className="adm-nav-rule mx-2 mb-2 border-t"
                aria-hidden="true"
              />
            ) : (
              <p className="adm-nav-kicker mb-[3px] px-2.5 font-mono-x text-[8.5px] tracking-[0.22em] uppercase">
                {group.title} · {group.en}
              </p>
            )}
            <ul className="space-y-[1px] font-sans-bn text-[12.5px] font-medium">
              {group.items.map((n) => {
                const here = ownerHref(path);
                const active = rowOwns(n, here);
                const badge =
                  n.countKeys?.reduce((sum, k) => sum + (counts[k] ?? 0), 0) ??
                  0;
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? n.label : undefined}
                      title={collapsed ? n.label : undefined}
                      className={`adm-nav-link group/nav relative flex items-center gap-3 rounded-lg py-[6px] transition-all duration-200 ${
                        collapsed ? "justify-center px-2" : "px-3"
                      } ${active ? "is-active" : ""}`}
                    >
                      {/*
                        In the rail the label is not rendered, so the glyph
                        carries the meaning. The name is carried by `title` and
                        `aria-label` rather than a CSS hover card: the nav is a
                        scroll container, and `overflow-y: auto` clips anything
                        that escapes it horizontally, so an absolutely-positioned
                        label beside the rail was never actually shown.
                      */}
                      {active && !collapsed ? (
                        <span
                          className="adm-nav-marker absolute -left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="relative" data-icon-host>
                        <NavIcon
                          name={n.icon}
                          size={16}
                          active={active}
                          settle={active}
                        />
                        {collapsed && badge > 0 ? (
                          <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-alizarin ring-2 ring-panel" />
                        ) : null}
                      </span>
                      {!collapsed ? (
                        <>
                          <span className="adm-nav-label flex-1">
                            {n.label}
                          </span>
                          {badge > 0 && (
                            <span className="rounded-full bg-alizarin px-1.5 py-0.5 font-mono-x text-[9px] font-bold text-on-accent">
                              {toBn(badge)}
                            </span>
                          )}
                          {active && (
                            <span className="adm-nav-marker ml-auto h-1.5 w-1.5 rounded-full" />
                          )}
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

      {/*
        No vault panel here. "Keys encrypted" is a claim about the system, and the
        rail was repeating it on every screen in a 96 px card — costing exactly
        the height the twenty-one nav rows needed. It lives on
        /admin/security, where someone can also act on it.
      */}

      <div
        className={`adm-nav-head shrink-0 border-t py-3 ${collapsed ? "px-1" : "px-3"}`}
      >
        <div
          className={`adm-nav-identity flex items-center gap-1.5 text-[10.5px] ${collapsed ? "justify-center" : ""}`}
        >
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
  const here = ownerHref(path);
  const active = NAV.find((n) => rowOwns(n, here));
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
          {active ? active.label : "হৈচৈ কন্ট্রোল"}
        </span>
        <span className="min-w-0 truncate text-[10.5px] text-white/60 sm:text-right">
          {email}
        </span>
        <span className="flex items-center gap-3 font-mono-x text-[9.5px] tracking-[0.16em] text-white/55 uppercase lg:justify-self-end">
          <span>ASIA/DHAKA</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">BUILD {SITE_BUILD}</span>
        </span>
      </div>
    </footer>
  );
}

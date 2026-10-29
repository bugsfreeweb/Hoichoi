import Link from "next/link";
import { TopBar } from "@/components/site/Chrome";
import ThemeToggle from "@/components/theme/ThemeToggle";

const NAV_ICON: Record<string, string> = {
  "/admin/ads": "▦",
  "/admin/ads/analytics": "↗",
  "/admin/ads/studio": "✳",
  "/admin/ads/builder": "⠿",
  "/admin/ads/slots": "▣",
  "/admin/ads/bookings": "▤",
  "/admin/ads/templates": "▧",
  "/admin/ads/clients": "♙",
  "/admin/ads/payments": "৳",
  "/admin/ads/activity": "◷",
  "/portal": "▦",
  "/portal/studio": "✳",
  "/portal/builder": "⠿",
  "/portal/analytics": "↗",
  "/portal/book": "+",
  "/portal/bookings": "▤",
  "/portal/creatives": "▧",
  "/portal/payments": "৳",
};

export function ConsoleShell({
  kind,
  nav,
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  kind: "admin" | "client";
  nav: { href: string; label: string; icon?: React.ReactNode }[];
  active: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isAdmin = kind === "admin";
  const userLabel = isAdmin ? "HOICHOI · ADMIN" : "RANG BANGLADESH";

  return (
    <div className="console min-h-screen">
      <TopBar active={isAdmin ? "admin" : "ads"} />

      <header className="console-topbar">
        <div className="console-topbar-inner">
          <Link href={isAdmin ? "/admin/ads" : "/portal"} className="console-brand">
            <span className="console-brand-mark">হ</span>
            <span className="console-brand-copy">
              <b>{isAdmin ? "অ্যাড অপারেশনস" : "অ্যাডভার্টাইজার"}</b>
              <small>{isAdmin ? "HOICHOI · OPS CONSOLE" : "HOICHOI · CLIENT WORKSPACE"}</small>
            </span>
          </Link>

          <div className="console-topbar-center">
            <span className="workspace-live"><i />{isAdmin ? "সিস্টেম সচল" : "ক্যাম্পেইন সচল"}</span>
            <span className="console-separator" />
            <span className="console-date">১১ অক্টোবর ২০২৬</span>
          </div>

          <div className="console-topbar-actions">
            <ThemeToggle />
            <span className="account-chip">
              <span className="account-avatar">{isAdmin ? "A" : "র"}</span>
              <span className="account-copy"><b>{userLabel}</b><small>{isAdmin ? "SUPER ADMIN" : "CLIENT ACCOUNT"}</small></span>
              <span className="account-chevron">⌄</span>
            </span>
          </div>
        </div>
      </header>

      <div className="console-workspace">
        <aside className="console-sidebar">
          <div className="sidebar-context">
            <span className="sidebar-context-label">WORKSPACE</span>
            <span className="sidebar-context-title">{isAdmin ? "Ad operations" : "My advertising"}</span>
          </div>
          <p className="sidebar-section-label">মেনু</p>
          <nav className="sidebar-nav" aria-label={isAdmin ? "অ্যাডমিন মেনু" : "ক্লায়েন্ট মেনু"}>
            {nav.map((n, i) => {
              const selected = active === n.href;
              const icon = n.icon ?? NAV_ICON[n.href] ?? "·";
              const isAnalytics = n.href.endsWith("analytics");
              const isStudio = n.href.endsWith("studio");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={selected ? "page" : undefined}
                  className={`sidebar-link ${selected ? "sidebar-link-active" : ""} ${isAnalytics ? "sidebar-link-insight" : ""} ${isStudio ? "sidebar-link-studio" : ""}`}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">{icon}</span>
                  <span className="sidebar-link-label">{n.label}</span>
                  {isAnalytics || isStudio ? <span className="sidebar-link-spark" aria-hidden="true">✦</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-spacer" />

          <div className="sidebar-help-card">
            <span className="sidebar-help-icon">?</span>
            <p>সহায়তা দরকার?</p>
            <small>ক্যাম্পেইন নিয়ে আমাদের সাথে কথা বলুন।</small>
            <a href="mailto:ads@hoichoi.example">ads@hoichoi.example ↗</a>
          </div>

          <div className="sidebar-foot">
            <span className="live-dot" />
            <span>AD PLATFORM · V2.0</span>
          </div>
        </aside>

        <main className="console-main">
          <div className="console-breadcrumb">
            <span>হৈচৈ</span><b>/</b><span>{isAdmin ? "অ্যাড অপারেশনস" : "ক্লায়েন্ট ওয়ার্কস্পেস"}</span><b>/</b><strong>{title}</strong>
          </div>

          <div className="console-page-heading">
            <div className="console-page-heading-copy">
              <p className="c-label">{isAdmin ? "AD OPERATIONS" : "MY ADVERTISING"}</p>
              <h1>{title}</h1>
              {subtitle ? <p className="console-page-subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="console-page-actions">{actions}</div> : null}
          </div>

          <div className="console-content">{children}</div>

          <footer className="console-footer">
            <p>© ২০২৬ হৈচৈ · AD PLATFORM V2.0</p>
            <div>
              <Link href="/">পাবলিক সাইট</Link>
              <Link href="/advertise">রেট কার্ড</Link>
              <Link href={isAdmin ? "/portal" : "/admin/ads"}>{isAdmin ? "ক্লায়েন্ট ভিউ" : "অ্যাডমিন ভিউ"}</Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export const ADMIN_NAV = [
  { href: "/admin/ads", label: "ড্যাশবোর্ড" },
  { href: "/admin/ads/analytics", label: "অ্যানালিটিক্স" },
  { href: "/admin/ads/studio", label: "স্টুডিও" },
  { href: "/admin/ads/builder", label: "লেআউট বিল্ডার" },
  { href: "/admin/ads/slots", label: "স্লট" },
  { href: "/admin/ads/bookings", label: "বুকিং" },
  { href: "/admin/ads/templates", label: "টেমপ্লেট" },
  { href: "/admin/ads/clients", label: "ক্লায়েন্ট" },
  { href: "/admin/ads/payments", label: "পেমেন্ট" },
  { href: "/admin/ads/activity", label: "অ্যাক্টিভিটি" },
];

export const CLIENT_NAV = [
  { href: "/portal", label: "ড্যাশবোর্ড" },
  { href: "/portal/studio", label: "স্টুডিও" },
  { href: "/portal/builder", label: "লেআউট বিল্ডার" },
  { href: "/portal/analytics", label: "অ্যানালিটিক্স" },
  { href: "/portal/book", label: "দ্রুত বুকিং" },
  { href: "/portal/bookings", label: "আমার বুকিং" },
  { href: "/portal/creatives", label: "ক্রিয়েটিভ" },
  { href: "/portal/payments", label: "পেমেন্ট" },
];

/* ------------------------- shared data components ------------------------- */

export function Stat({
  label,
  value,
  sub,
  accent = "#5f8f0e",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="c-card stat-card">
      <div className="stat-card-top"><p className="c-label">{label}</p><span className="stat-accent-dot" style={{ background: accent }} /></div>
      <p className="stat-value">{value}</p>
      {sub ? <p className="stat-sub">{sub}</p> : null}
      <div className="stat-accent-line" style={{ background: accent }} />
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: "st-active",
  scheduled: "st-active",
  pending_payment: "st-pending",
  in_review: "st-pending",
  draft: "st-draft",
  paused: "st-draft",
  expired: "st-expired",
  rejected: "st-expired",
  paid: "st-paid",
  initiated: "st-pending",
  failed: "st-expired",
  refunded: "st-draft",
  approved: "st-active",
  pending: "st-pending",
  blocked: "st-expired",
};

const STATUS_BN: Record<string, string> = {
  active: "লাইভ",
  scheduled: "নির্ধারিত",
  pending_payment: "পেমেন্ট বাকি",
  in_review: "রিভিউতে",
  draft: "খসড়া",
  paused: "বিরতি",
  expired: "মেয়াদোত্তীর্ণ",
  rejected: "বাতিল",
  paid: "পরিশোধিত",
  initiated: "শুরু হয়েছে",
  failed: "ব্যর্থ",
  refunded: "ফেরত",
  approved: "অনুমোদিত",
  pending: "অপেক্ষমাণ",
  blocked: "ব্লকড",
};

export function StatusPill({ s }: { s: string }) {
  return <span className={`c-pill ${STATUS_STYLE[s] ?? "st-draft"}`}>{STATUS_BN[s] ?? s}</span>;
}

export function Money({ v }: { v: number }) {
  return <span className="font-mono-x">৳{v.toLocaleString("en-US")}</span>;
}

export function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="c-card section-card">
      <header className="section-card-header">
        <h2 className="font-serif-bn text-[17px] font-black text-ink">{title}</h2>
        {right}
      </header>
      <div className="section-card-body">{children}</div>
    </section>
  );
}

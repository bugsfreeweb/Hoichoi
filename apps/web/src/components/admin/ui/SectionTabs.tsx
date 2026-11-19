import Link from "next/link";

/**
 * Group tabs for a set of sibling console screens.
 *
 * The requests were about menu length, not about fewer features: Sources and
 * Categories belong together, so do Live/Notices/Polls; content and comment
 * moderation are one queue with two subjects; submissions, removal requests and
 * reader reports are one inbox. Rather than nest routes (which breaks every
 * existing link and every bookmark), each screen in a group renders the same tab
 * strip and the sidebar shows one entry per group.
 *
 * Implemented as links, deliberately: a tab that only works after hydration is a
 * tab that fails on a slow connection, and these are server-rendered pages whose
 * state already lives in the URL (`?page`, `?view`, `?tab`).
 */
export interface SectionTab {
  href: string;
  label: string;
  /** The English domain name, for the tab's `title`. */
  en?: string;
  /** Rendered as a small pill — a real count, never a decoration. */
  count?: number | null;
}

export function SectionTabs({
  tabs,
  current,
  label,
}: {
  tabs: SectionTab[];
  /** The pathname of the page rendering the strip. */
  current: string;
  /** Screen-reader name for the group, in Bangla. */
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="mb-4 flex flex-wrap items-center gap-1 border-b border-ink/20 pb-0"
    >
      {tabs.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            title={tab.en}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 font-sans-bn text-[13px] font-bold transition-colors ${
              active
                ? "border-alizarin text-ink"
                : "border-transparent text-ink-soft hover:border-ink/30 hover:text-ink"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-px font-mono-x text-[9.5px] font-bold ${
                  active ? "bg-alizarin text-on-accent" : "bg-ink/10 text-ink"
                }`}
              >
                {new Intl.NumberFormat("bn-BD").format(tab.count)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

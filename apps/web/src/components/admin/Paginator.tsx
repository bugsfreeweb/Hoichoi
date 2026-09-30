import Link from "next/link";

/**
 * Compact pagination control for admin list pages.
 *
 * The logs and archive pages previously hardcoded a LIMIT with no way to see
 * anything older, so history was effectively invisible past the first page.
 * These are plain links rather than a client component: the pages are
 * server-rendered and force-dynamic, so a full navigation is correct and keeps
 * the URL shareable.
 */
export function Paginator({
  page,
  pageSize,
  total,
  basePath,
  paramName = "page",
  extraParams = {},
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  /** Query-string key this control drives. Pages with two lists give each its own. */
  paramName?: string;
  extraParams?: Record<string, string>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    // Keep the sibling list on the page it was already showing, so paging one
    // section does not silently reset the other.
    const q = new URLSearchParams({ ...extraParams, [paramName]: String(p) });
    return `${basePath}?${q.toString()}`;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-4">
      <p className="font-mono-x text-[11px] text-ink-soft">
        {from}–{to} / {total}
      </p>
      <div className="flex items-center gap-1.5">
        <PageLink href={href(page - 1)} disabled={page <= 1}>
          ← আগের
        </PageLink>
        <span className="px-2 font-mono-x text-[11px] text-ink-soft">
          {page} / {pageCount}
        </span>
        <PageLink href={href(page + 1)} disabled={page >= pageCount}>
          পরের →
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-ink/10 px-3 py-1.5 text-[11.5px] font-bold text-ink-soft/40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-ink/30 px-3 py-1.5 text-[11.5px] font-bold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
    >
      {children}
    </Link>
  );
}

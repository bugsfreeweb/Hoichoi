import Link from "next/link";
import { bnNum } from "@/lib/bn";

/**
 * Classic offset pagination for the public collection grids. Renders nothing
 * when there is a single page. `base` is the collection URL without the
 * `?page=` suffix (e.g. `/` or `/category/politics`).
 */
export function Pagination({
  page,
  pageCount,
  base = "/",
}: {
  page: number;
  pageCount: number;
  base?: string;
}) {
  if (pageCount <= 1) return null;
  const href = (n: number) => (n === 1 ? base : `${base}?page=${n}`);

  const pages: number[] = [];
  const pushIf = (n: number) => {
    if (n >= 1 && n <= pageCount && (pages.length === 0 || pages[pages.length - 1] !== n)) pages.push(n);
  };
  pushIf(1);
  if (page > 3) pushIf(page - 2);
  if (page > 2) pushIf(page - 1);
  pushIf(page);
  if (page < pageCount - 1) pushIf(page + 1);
  if (page < pageCount - 2) pushIf(page + 2);
  pushIf(pageCount);
  const numbered = pages.filter((n) => n !== 1 && n !== pageCount);
  const firstNumbered = numbered.at(0);
  const lastNumbered = numbered.at(-1);
  const ellipsisBefore = firstNumbered !== undefined && firstNumbered > 2;
  const ellipsisAfter = lastNumbered !== undefined && lastNumbered < pageCount - 1;

  const btn = "flex h-10 min-w-10 items-center justify-center border border-ink/25 bg-paper px-3 text-[12.5px] font-bold text-ink transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper";
  const btnDisabled = "flex h-10 min-w-10 items-center justify-center border border-ink/15 bg-paper px-3 text-[12.5px] font-bold text-ink/30";
  const btnActive = "flex h-10 min-w-10 items-center justify-center border border-ink bg-ink px-3 text-[12.5px] font-bold text-paper";

  return (
    <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="পৃষ্ঠা">
      {page > 1 ? (
        <Link href={href(page - 1)} className={btn}>
          <span aria-hidden>←</span> আগের
        </Link>
      ) : (
        <span className={btnDisabled}>← আগের</span>
      )}

      <Link href={href(1)} className={page === 1 ? btnActive : btn}>
        {bnNum(1)}
      </Link>

      {ellipsisBefore && <span className="px-1 font-mono-x text-[12px] text-ink-soft">…</span>}

      {numbered.map((n) => (
        <Link key={n} href={href(n)} className={n === page ? btnActive : btn}>
          {bnNum(n)}
        </Link>
      ))}

      {ellipsisAfter && pageCount > 1 && <span className="px-1 font-mono-x text-[12px] text-ink-soft">…</span>}

      {pageCount > 1 && (
        <Link href={href(pageCount)} className={page === pageCount ? btnActive : btn}>
          {bnNum(pageCount)}
        </Link>
      )}

      <span className="mx-1 font-mono-x text-[11px] tracking-wide text-ink-soft uppercase">
        পৃষ্ঠা {bnNum(page)} / {bnNum(pageCount)}
      </span>

      {page < pageCount ? (
        <Link href={href(page + 1)} className={btn}>
          পরবর্তী <span aria-hidden>→</span>
        </Link>
      ) : (
        <span className={btnDisabled}>পরবর্তী →</span>
      )}
    </nav>
  );
}
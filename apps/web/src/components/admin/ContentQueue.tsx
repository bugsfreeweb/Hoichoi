import Link from "next/link";
import { bnTime, toBn } from "@/lib/format";
import { categoryLabel, categoryTint } from "@/lib/category-style";
import type { CategoryMeta, Post } from "@hoichoi/shared-types";
import { Paginator } from "@/components/admin/Paginator";

/**
 * Dashboard content queue.
 *
 * This used to be a client component that received the 300 most recent posts and
 * then filtered them in the browser. That was wrong in a way that was easy to
 * miss: the tab counters read "সব 300" and a search could only ever match inside
 * that window, so the numbers on the queue did not describe the queue and an
 * operator searching for an older title was told nothing matched when it did.
 *
 * Filtering, searching and paging now happen in SQL, so the counters come from
 * real totals and a search covers every row. Tabs are links and the search box
 * is a GET form, which keeps the whole component server-rendered: the URL holds
 * the state, so a filtered queue is shareable and back/forward work.
 */

type Tab = "all" | "published" | "pending";

const TAB_LABEL: Record<Tab, string> = {
  all: "সব",
  published: "প্রকাশিত",
  pending: "অপেক্ষমান",
};

const STATUS_STYLE: Record<string, { bg: string; tx: string; bn: string }> = {
  published: { bg: "bg-lime/15", tx: "text-lime", bn: "প্রকাশিত" },
  pending_review: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
  approved: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
  rejected: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
  removed: { bg: "bg-amberx/15", tx: "text-amberx", bn: "রিভিউ অপেক্ষায়" },
};

const STYLE_DEFAULT: { bg: string; tx: string; bn: string } = {
  bg: "bg-amberx/15",
  tx: "text-amberx",
  bn: "রিভিউ অপেক্ষায়",
};

export default function ContentQueue({
  rows,
  cats,
  tab,
  q,
  counts,
  total,
  page,
  pageSize,
}: {
  rows: Post[];
  cats?: Array<Pick<CategoryMeta, "slug" | "dot" | "displayNameBn" | "displayNameEn">>;
  tab: Tab;
  q: string;
  counts: Record<Tab, number>;
  total: number;
  page: number;
  pageSize: number;
}) {
  // Tab changes reset paging: page 3 of a longer list is usually past the end of
  // a narrower one, and landing on an empty page looks like data loss.
  const tabHref = (t: Tab): string => {
    const params = new URLSearchParams({ tab: t });
    if (q) params.set("q", q);
    return `/admin?${params.toString()}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <p className="font-serif-bn text-[17px] font-bold text-white">কনটেন্ট সারি</p>
        <span className="font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
          CONTENT QUEUE · AUTO-FEED
        </span>

        <form method="get" action="/admin" className="ml-auto flex items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              name="q"
              defaultValue={q}
              placeholder="শিরোনাম / সোর্স খুঁজুন…"
              className="w-44 bg-transparent text-[11.5px] text-white/85 outline-none placeholder:text-white/30"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            খুঁজুন
          </button>
          {q && (
            <Link
              href={tabHref(tab)}
              className="rounded-lg px-2 py-1.5 text-[11.5px] text-white/45 transition-colors hover:text-white"
            >
              মুছুন
            </Link>
          )}
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/8 px-5 py-3">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            aria-current={tab === t ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 ${
              tab === t ? "bg-white text-night" : "text-white/50 hover:bg-white/8 hover:text-white"
            }`}
          >
            {TAB_LABEL[t]}{" "}
            <span className={`font-mono-x text-[9.5px] ${tab === t ? "text-night/60" : "text-white/35"}`}>
              {toBn(counts[t])}
            </span>
          </Link>
        ))}
        {q && (
          <span className="ml-auto font-mono-x text-[10.5px] text-white/50">
            &ldquo;{q}&rdquo; · {toBn(total)} মিলেছে
          </span>
        )}
      </div>

      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="px-5 py-3 font-medium"># আইটেম</th>
              <th className="px-3 py-3 font-medium">সোর্স</th>
              <th className="px-3 py-3 font-medium">সংগ্রহ</th>
              <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((r) => {
              const s = STATUS_STYLE[r.status] ?? STYLE_DEFAULT;
              return (
                <tr key={r.id} className="group transition-colors duration-200 hover:bg-white/[0.035]">
                  <td className="max-w-[340px] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono-x text-[10px] text-white/30">
                        {String(r.id).slice(0, 6)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-white/90">
                          {r.title_bn}
                        </p>
                        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] text-white/55">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: categoryTint(r.category, cats) }}
                          />
                          {categoryLabel(r.category, cats)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[11.5px] text-white/60">{r.source_name}</td>
                  <td className="px-3 py-3.5 font-mono-x text-[11px] text-white/60">
                    {bnTime(r.created_at)}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg} ${s.tx}`}>
                      {s.bn}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5 opacity-40 transition-opacity duration-200 group-hover:opacity-100">
                      <Link
                        href="/admin/posts"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-lime/60 hover:text-lime"
                        title="পোস্ট এডিটরে খুলুন"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      </Link>
                      {r.status === "published" && (
                        <Link
                          href={`/post/${r.slug}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-lime/60 hover:text-lime"
                          title="সাইটে দেখুন"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-[12.5px] text-white/35">
                  {q ? `“${q}” — এই সারিতে কিছু মেলেনি।` : "কোনো আইটেম নেই — ফিল্টার বদলে দেখুন।"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 pb-2">
        <Paginator
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin"
          extraParams={{ tab, ...(q ? { q } : {}) }}
        />
      </div>
    </div>
  );
}

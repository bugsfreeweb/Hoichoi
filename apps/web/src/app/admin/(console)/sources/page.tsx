import { mapSource, getSourceCategories, listCategories, pageRows } from "@hoichoi/db";
import type { Source } from "@hoichoi/shared-types";
import { SourceForm } from "@/components/admin/SourceForm";
import { SourceRow } from "@/components/admin/SourceRow";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;

  const page = await pageRows<Record<string, unknown>>({
    sql: "SELECT * FROM sources",
    order: "created_at DESC",
    page: Number(pageParam ?? 1),
    pageSize: PAGE_SIZE,
  });

  // Resolve category membership only for the rows on screen. Hydrating every
  // source meant one extra query per source on every page load.
  const sources: Source[] = await Promise.all(
    page.rows.map(async (r) => mapSource(r, await getSourceCategories(String(r.id)))),
  );
  // Inactive categories must stay selectable here. The editor round-trips the
  // whole membership set, so a category hidden from this list would be erased
  // from the source the next time anyone saved an unrelated field.
  const cats = await listCategories({ includeInactive: true });
  const options = cats.map((c) => ({
    slug: c.slug,
    label: c.isActive ? c.displayNameBn : `${c.displayNameBn} (নিষ্ক্রিয়)`,
  }));

  return (
    <div>
      <PageHeading emoji="📡" kicker="SOURCE DIRECTORY" title="সোর্স" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="border border-ink/20 bg-paper-deep p-5">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">নতুন সোর্স যোগ</h3>
          <p className="mt-1 text-[12px] text-ink-soft">শুধু পাবলিক পেজ/গ্রুপ — ব্যক্তিগত প্রোফাইল নয়।</p>
          <div className="mt-4">
            <SourceForm categories={options} />
          </div>
        </div>
        <div className="space-y-2.5">
{sources.length === 0 && (
            <p className="border border-ink/20 p-5 text-[13px] text-ink-soft">এখনও কোনো সোর্স যোগ করা হয়নি</p>
          )}
          {sources.map((s) => (
            <SourceRow
              key={s.id}
              source={s}
              categories={options}
            />
          ))}
          <Paginator
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            basePath="/admin/sources"
          />
        </div>
      </div>
    </div>
  );
}

function PageHeading({ emoji, kicker, title }: { emoji: string; kicker: string; title: string }) {
  return (
    <header>
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
        {emoji} {kicker}
      </p>
      <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">{title}</h1>
    </header>
  );
}
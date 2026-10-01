import { mapCategory, pageRows } from "@hoichoi/db";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryRow } from "@/components/admin/CategoryRow";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;

  const result = await pageRows({
    sql: "SELECT * FROM category_configs",
    order: "sort_order ASC, slug ASC",
    page: Number(pageParam ?? 1),
    pageSize: PAGE_SIZE,
    map: mapCategory,
  });
  const categories = result.rows;

  return (
    <div>
      <PageHeading emoji="🗂️" kicker="CATEGORY CONFIG" title="বিভাগ" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[340px_1fr]">
        <div className="border border-ink/20 bg-paper-deep p-5">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">নতুন বিভাগ যোগ</h3>
          <p className="mt-1 text-[12px] text-ink-soft">স্লাগ ইংরেজিতে, লোয়ার-কেস — একবার তৈরি হলে বদলানো যায় না।</p>
          <div className="mt-4">
            <CategoryForm />
          </div>
        </div>
        <div className="space-y-2.5">
          {categories.length === 0 && (
            <p className="border border-ink/20 p-5 text-[13px] text-ink-soft">কোনো বিভাগ নেই।</p>
          )}
          {categories.map((c) => (
            <CategoryRow key={c.slug} category={c} />
          ))}
          <Paginator
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            basePath="/admin/categories"
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
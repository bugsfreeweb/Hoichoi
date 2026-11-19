import { PageHeading } from "@/components/admin/ui/PageHeader";
import {
  SectionTabs,
  type SectionTab,
} from "@/components/admin/ui/SectionTabs";
import { TAXONOMY_SECTION } from "@/components/admin/ui/sections";
import { ViewToggle } from "@/components/admin/ui/ViewToggle";
import { mapCategory, pageRows } from "@hoichoi/db";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryRow } from "@/components/admin/CategoryRow";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>;
}) {
  const { page: pageParam, view } = await searchParams;
  const grid = view === "card";

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
      <SectionTabs
        tabs={TAXONOMY_SECTION.tabs as unknown as SectionTab[]}
        current="/admin/categories"
        label={TAXONOMY_SECTION.label}
      />
      <PageHeading
        emoji="🗂️"
        kicker="CATEGORY CONFIG"
        title="বিভাগ"
        description="সাইটের বিভাগ, ক্রম ও দৃশ্যমানতা চালান — ক্রম বদলালে হোম ও বিভাগ পেজ সঙ্গে সঙ্গে বদলায়।"
      />
      <div className="mt-4 flex items-center justify-end">
        <ViewToggle labelBn="দৃশ্য" />
      </div>
      <div className="mt-3 grid gap-8 lg:grid-cols-[340px_1fr]">
        <div className="border border-ink/20 bg-paper-deep p-5">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">
            নতুন বিভাগ যোগ
          </h3>
          <p className="mt-1 text-[12px] text-ink-soft">
            স্লাগ ইংরেজিতে, লোয়ার-কেস — একবার তৈরি হলে বদলানো যায় না।
          </p>
          <div className="mt-4">
            <CategoryForm />
          </div>
        </div>
        <div
          className={
            grid ? "grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2.5"
          }
        >
          {categories.length === 0 && (
            <p className="border border-ink/20 p-5 text-[13px] text-ink-soft">
              কোনো বিভাগ নেই।
            </p>
          )}
          {categories.map((c) => (
            <CategoryRow
              key={c.slug}
              category={c}
              variant={grid ? "card" : "row"}
            />
          ))}
          <div className={grid ? "col-span-full" : ""}>
            <Paginator
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              basePath={`/admin/categories${grid ? "?view=card" : ""}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

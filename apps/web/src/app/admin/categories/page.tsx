import type { Metadata } from "next";
import { listCategories } from "@hoichoi/db";
import { requirePageUser } from "@/lib/auth";
import { PageSection } from "@/components/PageSection";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = {
  title: "বিভাগ ব্যবস্থাপনা",
};

export default async function CategoriesPage() {
  await requirePageUser();
  const categories = await listCategories();

  return (
    <PageSection kicker="বিভাগ" title="বিভাগ ব্যবস্থাপনা">
      <div className="mx-auto max-w-3xl">
        <CategoryManager initial={categories} />
      </div>
    </PageSection>
  );
}
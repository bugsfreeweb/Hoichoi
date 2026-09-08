import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { windowPosts, countWindowPosts } from "@hoichoi/db";
import { findCategory, getCategories } from "@/lib/categories-server";
import { CollectionGrid } from "@/components/CollectionGrid";
import type { CategorySlug } from "@hoichoi/shared-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) return { title: "বিভাগ পাওয়া যায়নি" };
  return {
    title: cat.displayNameBn,
    description: cat.descriptionBn,
  };
}

const VALID: CategorySlug[] = ["child-sexual-abuse", "extramarital-crime", "missing-children"];

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!VALID.includes(slug as CategorySlug)) notFound();
  const [cat, cats, posts, total] = await Promise.all([
    findCategory(slug),
    getCategories(),
    windowPosts({ category: slug as CategorySlug, limit: 60 }),
    countWindowPosts(slug as CategorySlug),
  ]);
  if (!cat) notFound();
  const color = cat.dot ? `#${cat.dot}` : "#0a0c10";

  return (
    <section className="mx-auto max-w-site px-4 py-14 md:px-8">
      <div className="border-b-2 border-ink pb-6">
        <p className="font-mono-x text-[10.5px] tracking-[0.26em] uppercase" style={{ color }}>
          ▚ CATEGORY · AUTO-CURATED
        </p>
        <h1 className="mt-2 font-serif-bn text-[40px] font-black text-ink md:text-[56px]">{cat.displayNameBn}</h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">{cat.descriptionBn}</p>
        <p className="mt-4 font-mono-x text-[10.5px] tracking-[0.18em] text-ink-soft uppercase">
          CURRENT WINDOW · {total} পোস্ট
        </p>
      </div>
      <div className="mt-10">
        <CollectionGrid posts={posts} cats={cats} />
      </div>
    </section>
  );
}
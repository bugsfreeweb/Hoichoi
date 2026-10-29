import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar, Ticker, Footer, MobileAnchor, RightRail } from "@/components/site/Chrome";
import PostCard from "@/components/site/PostCard";
import AdSlot from "@/components/ads/AdSlot";
import { CATEGORIES, CATEGORY_MAP, POSTS } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORY_MAP[slug];
  if (!cat) notFound();

  const inCat = POSTS.filter((p) => p.category === slug);
  const list = inCat.length ? inCat : POSTS.slice(0, 6);

  return (
    <div className="page-chrome min-h-screen">
      <TopBar active="site" />
      <Ticker />

      <main className="bg-paper">
        <section className="border-b border-ink/15 bg-ink/[0.04]">
          <div className="mx-auto max-w-site px-4 py-12 md:px-8">
            <nav className="flex items-center gap-2 font-mono-x text-[10.5px] tracking-[0.16em] text-ink-soft uppercase">
              <Link href="/" className="hover:text-alizarin">হোম</Link>
              <span>/</span>
              <span className="text-ink/45">বিভাগ</span>
            </nav>
            <h1 className="mt-4 flex items-center gap-3 font-serif-bn text-[40px] font-black text-ink">
              <span className="h-3 w-3 rounded-full" style={{ background: cat.color }} />
              {cat.name}
            </h1>
            <p className="mt-2 font-mono-x text-[11px] tracking-[0.2em] text-ink-soft uppercase">
              {cat.count} টি প্রতিবেদন · AUTO-CATEGORIZED BY LLM
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className={`flex items-center gap-2 border px-3.5 py-1.5 text-[12.5px] font-bold transition-all duration-300 ${
                    c.slug === slug
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/20 bg-paper text-ink hover:border-ink hover:bg-ink hover:text-paper"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ AD SLOT · category_top_leaderboard (NEW) ══════════ */}
        <div className="mx-auto max-w-site px-4 pt-8 md:px-8">
          <AdSlot slotKey="category_top_leaderboard" />
        </div>

        <section className="mx-auto max-w-site px-4 py-14 md:px-8">
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, 2).map((p, i) => (
              <PostCard key={p.slug} post={p} delay={i * 80} />
            ))}

            {/* ══════════ AD SLOT · category_infeed (NEW) ══════════ */}
            <AdSlot slotKey="category_infeed" />

            {list.slice(2).map((p, i) => (
              <PostCard key={p.slug} post={p} delay={(i + 3) * 80} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <MobileAnchor />
      <RightRail />
      <div className="h-16 md:hidden" />
    </div>
  );
}

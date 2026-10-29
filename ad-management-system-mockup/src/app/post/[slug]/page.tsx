import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar, Ticker, Footer, MobileAnchor, RightRail } from "@/components/site/Chrome";
import PostCard from "@/components/site/PostCard";
import AdSlot from "@/components/ads/AdSlot";
import { CATEGORY_MAP, POSTS, POST_MAP } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POST_MAP[slug];
  if (!post) notFound();

  const cat = CATEGORY_MAP[post.category];
  const related = POSTS.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  const fallbackRelated = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const rel = related.length ? related : fallbackRelated;

  return (
    <div className="page-chrome min-h-screen">
      <TopBar active="site" />
      <Ticker />

      <main className="bg-paper">
        <article className="mx-auto max-w-site px-4 py-10 md:px-8 md:py-14">
          {/* breadcrumb */}
          <nav className="flex flex-wrap items-center gap-2 font-mono-x text-[10.5px] tracking-[0.16em] text-ink-soft uppercase">
            <Link href="/" className="hover:text-alizarin">হোম</Link>
            <span>/</span>
            <Link href={`/category/${post.category}`} className="hover:text-alizarin">{cat?.name}</Link>
            <span>/</span>
            <span className="text-ink/45">{post.hash}</span>
          </nav>

          {/* headline block */}
          <header className="mx-auto mt-8 max-w-4xl text-center">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-white"
              style={{ background: cat?.color ?? "#1a140d" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z" /></svg>
              {cat?.name}
            </span>
            <h1 className="mt-5 font-serif-bn text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.22] font-black text-ink">
              {post.title}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl font-serif-bn text-[17px] leading-relaxed font-bold text-ink-soft">
              {post.dek}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-soft">
              <span className="font-bold text-ink">{post.author}</span>
              <span className="text-ink-soft">(মূল ফেসবুক পোস্টের লেখক)</span>
              <span>·</span>
              <span><span className="font-bold">সূত্র:</span> <span className="font-serif-bn">{post.source}</span></span>
              <span>·</span>
              <span>{post.readMin} মিনিট পড়া</span>
              <span>·</span>
              <span className="font-mono-x text-[11px]">{post.publishedAt}</span>
            </div>

            <a
              href={post.originUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-alizarin hover:text-alizarin-deep"
            >
              মূল পোস্টের লিংক →
            </a>
          </header>

          {/* ══════════ AD SLOT · post_header_leaderboard (EXISTING — cloned) ══════════ */}
          <div className="mt-10">
            <AdSlot slotKey="post_header_leaderboard" />
          </div>

          {/* body + sidebar */}
          <div className="mt-12 grid gap-10 lg:grid-cols-12">
            {/* ---------- main column ---------- */}
            <div className="lg:col-span-7">
              <div className="frame-press relative overflow-hidden">
                <div className="aspect-[16/9] bg-paper-deep">
                  <div className="flex h-full items-center justify-center px-10">
                    <p className="text-center font-serif-bn text-[17px] leading-relaxed font-bold text-ink/40">
                      {post.teaser}
                    </p>
                  </div>
                </div>
                <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
                  SHOT_{post.shot} · PLAYWRIGHT
                </span>
              </div>

              <section className="mt-10 border border-ink/20 bg-ink/[0.03] p-5">
                <h2 className="font-mono-x text-[10.5px] tracking-[0.24em] text-alizarin uppercase">মূল বিষয়সমূহ</h2>
                <ul className="mt-3 space-y-2">
                  {post.keyPoints.map((k) => (
                    <li key={k} className="flex items-start gap-3 text-[13px] leading-relaxed text-ink-soft">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-alizarin" />
                      {k}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="mt-8 space-y-5">
                {post.body.slice(0, 3).map((para, i) => (
                  <p key={i} className="font-serif-bn text-[16.5px] leading-[1.95] text-ink">
                    {para}
                  </p>
                ))}
              </div>

              {/* ══════════ AD SLOT · post_inarticle (NEW — in-content native) ══════════ */}
              <div className="my-10 border-y border-ink/15 py-6">
                <p className="mb-3 text-center font-mono-x text-[9px] tracking-[0.26em] text-ink-soft/70 uppercase">
                  বিজ্ঞাপন বিরতি
                </p>
                <div className="mx-auto max-w-[420px]">
                  <AdSlot slotKey="post_inarticle" />
                </div>
              </div>

              <div className="space-y-5">
                {post.body.slice(3).map((para, i) => (
                  <p key={i} className="font-serif-bn text-[16.5px] leading-[1.95] text-ink">
                    {para}
                  </p>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-ink/15 pt-6">
                <span className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">ট্যাগ</span>
                {[cat?.name, post.source, "যাচাইকৃত", "পুনর্লিখিত"].map((t) => (
                  <span key={t} className="border border-ink/20 px-3 py-1 text-[11.5px] font-bold text-ink">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* ---------- sidebar ---------- */}
            <aside className="space-y-8 lg:col-span-5">
              <div className="border border-ink/20 p-5">
                <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">সম্পাদকীয় নোট</p>
                <ul className="mt-3 space-y-2.5">
                  {post.keyPoints.map((k) => (
                    <li key={k} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-ink-soft">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-alizarin" />
                      {k}
                    </li>
                  ))}
                </ul>
              </div>

              {/* ══════════ AD SLOT · post_sidebar_rect (EXISTING — cloned) ══════════ */}
              <AdSlot slotKey="post_sidebar_rect" />

              <div className="bg-band p-6 text-bandline">
                <p className="flex items-center gap-2 font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                  যাচাই সারসংক্ষেপ
                </p>
                <dl className="mt-4 space-y-2.5 text-[12.5px]">
                  {[
                    ["হ্যাশ", post.hash],
                    ["শট", `SHOT_${post.shot}`],
                    ["সূত্র", post.source],
                    ["ফ্যাক্ট-গেট", "০.৯৪ / ০.৯০"],
                    ["ডুপ্লিকেট", "পাওয়া যায়নি"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-bandline/15 pb-2">
                      <dt className="text-bandline/55">{k}</dt>
                      <dd className="font-mono-x text-bandline">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* ══════════ AD SLOT · post_sidebar_sticky (NEW — sticky half-page) ══════════ */}
              <div className="sticky top-16 hidden lg:block">
                <AdSlot slotKey="post_sidebar_sticky" />
              </div>
            </aside>
          </div>

          {/* ══════════ AD SLOT · post_endcap (NEW) ══════════ */}
          <div className="mt-16">
            <AdSlot slotKey="post_endcap" />
          </div>

          {/* comments */}
          <section className="mt-20 border-t-2 border-ink pt-10">
            <h2 className="font-serif-bn text-[28px] font-black text-ink">পাঠকের কথায় (০)</h2>
            <p className="mt-2 text-[13px] text-ink-soft">
              প্রতিটি মন্তব্য সম্পাদকীয় রিভিউ পেরিয়ে প্রকাশিত হয়।
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input className="c-input" placeholder="আপনার নাম" />
              <input className="c-input" placeholder="ইমেইল (প্রকাশ করা হবে না)" />
            </div>
            <textarea className="c-input mt-4" rows={4} placeholder="আপনার মন্তব্য লিখুন…" />
            <button className="c-btn mt-4">মন্তব্য পাঠান</button>
          </section>
        </article>

        {/* related */}
        <section className="mx-auto mt-20 max-w-site border-t-2 border-ink px-4 pt-10 pb-16 md:px-8">
          <h2 className="font-serif-bn text-[28px] font-black text-ink">একই বিভাগে আরও</h2>
          <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
            {rel.slice(0, 2).map((p, i) => (
              <PostCard key={p.slug} post={p} delay={i * 80} />
            ))}
            {/* ══════════ AD SLOT · post_related_infeed (NEW) ══════════ */}
            <AdSlot slotKey="post_related_infeed" />
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

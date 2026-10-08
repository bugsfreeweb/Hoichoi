import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPostBySlug, relatedPosts } from "@hoichoi/db";
import { getPostComments, getPostCommentCount } from "@hoichoi/db";
import { getCategories, findCategory } from "@/lib/categories-server";
import { readMinutesBn, shortId } from "@/lib/bn";
import { bnDate, bnTime } from "@/lib/format";
import { categoryLabel, categoryTint, readableOn } from "@/lib/category-style";
import { mediaUrl } from "@/lib/media";
import { siteUrl } from "@/lib/site";
import { CaseStatusBadge } from "@/components/CaseStatusBadge";
import { ContentWarningGate } from "@/components/ContentWarningGate";
import { ReportForm } from "@/components/ReportForm";
import { PostCard } from "@/components/PostCard";
import { CommentsSection } from "@/components/CommentsSection";
import { AdSlot } from "@/components/AdSlot";
import { FbPost } from "@/components/FbPost";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);
  if (!post) return { title: "পোস্টটি খুঁজে পাওয়া যায়নি" };
  // The same story is syndicated from Facebook and reachable under a few
  // slugs; a canonical URL plus og:url tells crawlers and social scrapers
  // which one is authoritative instead of treating each as duplicate content.
  const url = `${siteUrl()}/post/${slug}`;
  return {
    title: post.title_bn,
    description: post.summary_bn ?? post.body_bn.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title_bn,
      description: post.summary_bn ?? undefined,
      images: mediaUrl(post) ? [{ url: mediaUrl(post)!, alt: post.title_bn }] : undefined,
      publishedTime: post.published_at ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title_bn,
      description: post.summary_bn ?? undefined,
      images: mediaUrl(post) ? [mediaUrl(post)!] : undefined,
    },
  };
}

/**
 * Split the article body into paragraphs.
 *
 * Blank lines are the paragraph separator the rewrite prompt asks for, so that
 * is the primary rule. Some models instead emit one paragraph per line with no
 * blank line between them, so a single block falls back to splitting on every
 * newline rather than rendering one unbroken wall of text.
 */
function paragraphize(text: string): string[] {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const blankLineSplit = text
    .split(/\n\s*\n/)
    .map(clean)
    .filter(Boolean);
  if (blankLineSplit.length > 1) return blankLineSplit;
  return text
    .split(/\n/)
    .map(clean)
    .filter(Boolean);
}

/**
 * Build the "মূল বিষয়সমূহ" list from the article itself.
 *
 * The opening sentence of each paragraph is the natural summary of that
 * section, and deriving it here means the briefing stays correct for every
 * article without storing a second field or asking the model for one.
 */
function keyPointsFrom(paragraphs: string[], limit = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paragraphs) {
    // First sentence, tolerating Bangla danda (।) and ASCII full stops.
    const first = p.split(/(?<=।)|(?<=\.)\s/)[0]?.trim() ?? p;
    const point = first.length > 140 ? `${first.slice(0, 137).trimEnd()}…` : first;
    if (!point || seen.has(point)) continue;
    seen.add(point);
    out.push(point);
    if (out.length >= limit) break;
  }
  return out;
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);
  if (!post) notFound();

  const [cats, settings, related, initialComments, commentCount] = await Promise.all([
    getCategories(),
    getSettings(),
    relatedPosts(post, 3),
    getPostComments(post.id, 10),
    getPostCommentCount(post.id),
  ]);
  const cat = await findCategory(post.category);
  const isCsa = post.category === "child-sexual-abuse";
  const showHelplines = post.category === "missing-children";
  const isMissingActive = post.category === "missing-children" && post.case_status === "active";
  const src = mediaUrl(post);
  const minutes = readMinutesBn(post.body_bn);

  const content = (
    <PostContent
      post={post}
      cats={cats}
      src={src}
      minutes={minutes}
      isMissingActive={isMissingActive}
      showHelplines={showHelplines}
      related={related}
      initialComments={initialComments}
      initialCommentCount={commentCount}
      settings={settings}
      cat={cat}
    />
  );

  return (
    <main className="bg-paper">
      <article className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
        {isCsa && cat?.config.content_warning_text_bn ? (
          <ContentWarningGate warningText={cat.config.content_warning_text_bn}>
            {content}
          </ContentWarningGate>
        ) : (
          content
        )}
      </article>
    </main>
  );
}

function PostContent({
  post,
  cats,
  src,
  minutes,
  isMissingActive,
  showHelplines,
  related,
  initialComments,
  initialCommentCount,
  settings,
  cat,
}: {
  post: Awaited<ReturnType<typeof getPublicPostBySlug>> & {};
  cats: Awaited<ReturnType<typeof getCategories>>;
  src: string | null;
  minutes: string;
  isMissingActive: boolean;
  showHelplines: boolean;
  related: Awaited<ReturnType<typeof relatedPosts>>;
  initialComments: Awaited<ReturnType<typeof getPostComments>>;
  initialCommentCount: number;
  settings: Awaited<ReturnType<typeof getSettings>>;
  cat: Awaited<ReturnType<typeof findCategory>>;
}) {
  const tint = categoryTint(post!.category, cat ? [cat] : null);
  // Category dots are admin-editable, so a pale hue is entirely possible.
  // A fixed text-white would become unreadable white-on-white in light theme.
  const onTint = readableOn(tint);
  const label = categoryLabel(post!.category, cat ? [cat] : null);
  const paragraphs = paragraphize(post!.body_bn);
  const keyPoints = keyPointsFrom(paragraphs);
  const hash = shortId(post!.id);
  const item = `ITEM_${hash.slice(0, 4).toUpperCase()}`;
  const fbText =
    post!.summary_bn && post!.summary_bn.length > 0
      ? post!.summary_bn
      : paragraphize(post!.body_bn).slice(0, 1).join("\n\n");

  return (
    <>
      {/* breadcrumb */}
      <div className="flex flex-wrap items-center gap-3 font-mono-x text-[10.5px] tracking-[0.16em] text-ink-soft uppercase">
        <Link
          href="/"
          className="flex items-center gap-1.5 border border-ink/30 px-3 py-1.5 transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          প্রচ্ছদ
        </Link>
        <span>/ সংগ্রহ / {label} /</span>
        <span className="text-ink">{item}</span>
      </div>

      {/* headline block */}
      <header className="mx-auto mt-8 max-w-4xl text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold"
            style={{ background: tint, color: onTint }}
          >
            {label}
          </span>
          {isMissingActive && post!.case_status && <CaseStatusBadge status={post!.case_status} />}
        </div>
        <h1 className="mt-5 font-serif-bn text-[30px] leading-[1.32] font-black text-ink md:text-[46px]">
          {post!.title_bn}
        </h1>
        {post!.summary_bn && (
          <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">
            {post!.summary_bn}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-y border-ink/15 py-3 text-[11.5px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            ঢাকা · বাংলাদেশ
          </span>
          <span>{bnDate(post!.published_at ?? post!.created_at)}</span>
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {minutes} মিনিট পড়া
          </span>
          <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] tracking-wider">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            {hash}
          </span>
          <span className="flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.14em] uppercase">
            <svg xmlns="http://www.w3.org/2000/svg" width="10.5" height="10.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
            SOURCE · FB ARCHIVE
          </span>
        </div>
      </header>

      {/* hero image */}
      <figure className="mx-auto mt-10 max-w-5xl">
        <div className="frame-press overflow-hidden">
          {src ? (
            post!.media_kind === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={src} controls muted playsInline className="photo-grade aspect-[16/8.4] w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={post!.title_bn} className="photo-grade aspect-[16/8.4] w-full object-cover" />
            )
          ) : (
            <div className="aspect-[16/8.4] w-full bg-paper-deep">
              <div className="flex h-full items-center justify-center px-6">
                <p className="text-center font-serif-bn text-[15px] font-bold leading-relaxed text-ink/40">
                  {post!.summary_bn?.slice(0, 80) ?? post!.title_bn.slice(0, 60)}…
                </p>
              </div>
            </div>
          )}
        </div>
        <figcaption className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/85">
          <span>ছবি: {post!.original_author_name ?? "প্রতীকী"} · প্রতীকী</span>
          <span className="font-mono-x tracking-wide">
            SHOT_{hash.toUpperCase()}.PNG · PLAYWRIGHT CAPTURE · 1440×900
          </span>
        </figcaption>
      </figure>

      {/* body + sidebar */}
      <div className="mx-auto mt-12 grid max-w-6xl gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {/*
            The pull quote is inserted after the second paragraph rather than
            after the whole body. Placing it at the end left the article
            reading as one uninterrupted wall, and with the summary already
            rendered under the headline it duplicated that text a third time.
          */}
          {(() => {
            const QUOTE_AFTER = 2;
            const quote = post!.summary_bn;
            const out: React.ReactNode[] = [];
            paragraphs.forEach((p, i) => {
              if (i === QUOTE_AFTER && quote) {
                out.push(
                  <blockquote key="quote" className="my-10 border-y-2 border-ink py-8">
                    <p className="font-serif-bn text-[22px] leading-[1.6] font-bold text-ink md:text-[26px]">
                      “{quote}”
                    </p>
                    <cite className="mt-3 block font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase not-italic">
                      — পুনর্লিখিত প্রতিবেদন থেকে
                    </cite>
                  </blockquote>,
                );
              }
              out.push(
                <p
                  key={i}
                  className={`mb-6 text-[16px] leading-[1.95] text-ink/90 ${
                    i === 0
                      ? "first-letter:float-left first-letter:mr-3 first-letter:font-serif-bn first-letter:text-[64px] first-letter:leading-[0.8] first-letter:font-black first-letter:text-alizarin"
                      : ""
                  }`}
                >
                  {p}
                </p>,
              );
            });
            return out;
          })()}

          {/* briefing summary — gives a reader the whole case at a glance */}
          {keyPoints.length > 0 && (
            <section className="mt-10 border border-ink/20 bg-ink/[0.03] p-5 dark:bg-paper-deep/60">
              <p className="font-mono-x text-[10px] tracking-[0.22em] text-ink-soft uppercase">
                At a glance
              </p>
              <h2 className="mt-1.5 font-serif-bn text-[19px] font-bold text-ink">
                মূল বিষয়সমূহ
              </h2>
              <ul className="mt-3 space-y-2">
                {keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink/85">
                    <span
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: tint }}
                    />
                    {k}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex items-center gap-2 border border-ink/25 bg-ink/5 dark:bg-paper-deep/60 px-4 py-3 text-[11.5px] text-ink-soft">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-alizarin"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
            এই প্রতিবেদনটি ফেসবুকের উন্মুক্ত পোস্ট অবলম্বনে সংবাদ শৈলীতে
            পুনর্লিখিত; মূল পোস্টের স্ক্রিনশট আর্কাইভে সংরক্ষিত আছে।
          </div>

          {showHelplines && (
            <div className="mt-8 border border-ink/15 bg-ink/5 dark:bg-paper-deep p-4">
              <p className="text-[13px] font-bold text-ink">🆘 জরুরি সহায়তা</p>
              <p className="mt-2 text-[13px] text-ink-soft">
                <Link
                  href={`tel:${settings.police_helpline}`}
                  className="font-mono-x font-bold text-ink hover:text-alizarin"
                >
                  {settings.police_helpline.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)}
                </Link>
                <span className="mx-2 text-ink-soft/50">·</span>
                পুলিশ হেল্পলাইন
                <span className="mx-3 text-ink-soft/50">|</span>
                <Link
                  href={`tel:${settings.child_helpline}`}
                  className="font-mono-x font-bold text-ink hover:text-alizarin"
                >
                  {settings.child_helpline.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)}
                </Link>
                <span className="mx-2 text-ink-soft/50">·</span>
                শিশু হেল্পলাইন
              </p>
            </div>
          )}

          {/* source attribution */}
          <div className="mt-10 border-t border-ink/15 pt-6">
            <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">─── সূত্র ───</p>
            <p className="mt-3 text-[13px] text-ink">
              <span className="font-bold">লেখক:</span> <span className="font-serif-bn">{post!.original_author_name ?? "—"} </span>
              <span className="text-ink-soft">(মূল ফেসবুক পোস্টের লেখক)</span>
              <span className="mx-2">·</span>
              <span className="font-bold">সূত্র:</span> <span className="font-serif-bn">{post!.source_name}</span> (ফেসবুক পেজ) · {minutes} মিনিট পড়া
            </p>
            <Link
              className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-alizarin hover:text-alizarin-deep"
              href={post!.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              মূল পোস্টের লিংক →
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
            </Link>
          </div>

          {/* ad · in-article */}
          <div className="mt-10">
            <AdSlot variant="leaderboard" html={settings.ad_leaderboard_html} />
          </div>
        </div>

        {/* sidebar */}
        <aside className="lg:col-span-5">
          <div className="space-y-8 lg:sticky lg:top-20">
            <FbPost
              author={post!.original_author_name ?? post!.source_name}
              sourceName={post!.source_name}
              text={fbText}
              time={bnTime(post!.created_at)}
              hash={hash}
            />

            {/* rewrite notes */}
            <div className="border-[1.5px] border-ink p-6">
              <p className="flex items-center gap-2 font-serif-bn text-[16px] font-extrabold">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-alizarin"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                পুনর্লিখন নোট
              </p>
              <ul className="mt-4 space-y-3.5">
                {[
                  "কাঁচা ফিডের ভুল বানান ও দ্ব্যর্থক ভাষা বাদ দিয়ে সংবাদমাধ্যমের নির্ভরযোগ্য বাংলায় রচনা।",
                  "ঘটনার সময়, স্থান ও প্রেক্ষাপট সংস্লিষ্ট বিভাগভুক্ত তথ্য হিসেবে সাজানো হয়েছে।",
                  "সংবেদনশীল বিষয়ে অভিযুক্তের নাম-পরিচয় প্রকাশ না করে আইনি ও নৈতিক শৃঙ্খলা মেনে লেখা।",
                ].map((n) => (
                  <li key={n} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-ink-soft">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-alizarin" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>

            {/* ad · rectangle */}
            <AdSlot variant="rect" html={settings.ad_rect_html} />

            {/* data discipline — fixed dark band, readable in both themes */}
            <div className="bg-band p-6 text-bandline">
              <p className="flex items-center gap-2 font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>
                তথ্য শৃঙ্খলা
              </p>
              <dl className="mt-5 space-y-3 font-mono-x text-[11px]">
                <div className="flex items-center justify-between border-b border-bandline/15 pb-2.5">
                  <dt className="text-bandline/50">SOURCE_POST</dt>
                  <dd className="max-w-[55%] truncate text-right text-bandline/85">
                    {post!.source_name}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-bandline/15 pb-2.5">
                  <dt className="text-bandline/50">COLLECTED_AT</dt>
                  <dd className="text-bandline/85">{bnTime(post!.created_at)}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-bandline/15 pb-2.5">
                  <dt className="text-bandline/50">CONTENT_HASH</dt>
                  <dd className="text-amberx">{hash}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-bandline/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                    DEDUP_CHECK
                  </dt>
                  <dd className="text-lime">PASS · simhash 0.92</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>

      <ReportForm postId={post!.id} />
      <CommentsSection postId={post!.id} initial={initialComments} initialTotal={initialCommentCount} />

      {/* related */}
      {related.length > 0 && (
        <section className="mx-auto mt-20 max-w-[1400px] border-t-2 border-ink pt-10">
          <div className="flex items-end justify-between">
            <h2 className="font-serif-bn text-[28px] font-black text-ink md:text-[34px]">
              একই বিভাগে আরও
            </h2>
            <Link
              href={`/category/${post!.category}`}
              className="group flex items-center gap-2 text-[12.5px] font-bold text-ink"
            >
              সব দেখুন
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <PostCard key={a.id} post={a} cats={cats} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
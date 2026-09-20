import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Hash,
  MapPin,
  Timer,
  Rss,
  ShieldCheck,
  Fingerprint,
  FileText,
  CalendarClock,
} from "lucide-react";
import FbPost from "@/components/fb-post";
import ArticleCard from "@/components/article-card";
import Ticker from "@/components/ticker";
import CommentsSection from "@/components/comments-section";
import ReportForm from "@/components/report-form";
import { ensureReady } from "@/lib/db-bootstrap";
import AdSlot from "@/components/ad-slot";
import SiteFooter from "@/components/site-footer";
import {
  getArticleById,
  getArticles,
  getRelated,
  getComments,
  commentLite,
  lite,
  bnDate,
  bnTime,
  toBn,
  CATEGORY_LABEL,
  CATEGORY_TINT,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = await getArticleById(Number(id));
  return { title: a ? `${a.title} — হৈচৈ` : "হৈচৈ" };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureReady();
  const { id } = await params;
  const article = await getArticleById(Number(id));
  if (!article) notFound();

  const [related, all, commentRows] = await Promise.all([
    getRelated(article.category, article.id),
    getArticles(),
    getComments(article.id),
  ]);

  const tint = CATEGORY_TINT[article.category] ?? "#d2202c";
  const paragraphs = article.body.split("\n\n").filter(Boolean);
  const others = all
    .filter((a) => a.id !== article.id && a.status === "published")
    .slice(0, 5)
    .map((a) => a.title);

  return (
    <main className="bg-paper">
      <Ticker items={others} />

      <article className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
        {/* breadcrumb */}
        <div className="flex flex-wrap items-center gap-3 font-mono-x text-[10.5px] tracking-[0.16em] text-ink-soft uppercase">
          <Link
            href="/"
            className="flex items-center gap-1.5 border border-ink/30 px-3 py-1.5 transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper"
          >
            <ArrowLeft size={11} /> প্রচ্ছদ
          </Link>
          <span>/ সংগ্রহ / {CATEGORY_LABEL[article.category] ?? article.category} /</span>
          <span className="text-ink">ITEM_{String(article.id).padStart(4, "0")}</span>
        </div>

        {/* headline block */}
        <header className="mx-auto mt-8 max-w-4xl text-center">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-white"
            style={{ background: tint }}
          >
            {CATEGORY_LABEL[article.category] ?? article.category}
          </span>
          <h1 className="mt-5 font-serif-bn text-[30px] leading-[1.32] font-black text-ink md:text-[46px]">
            {article.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">
            {article.dek}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-y border-ink/15 py-3 text-[11.5px] text-ink-soft">
            <span className="flex items-center gap-1.5">
              <MapPin size={12} /> {article.location}
            </span>
            <span>{bnDate(article.publishedAt ?? article.collectedAt)}</span>
            <span className="flex items-center gap-1.5">
              <Timer size={12} /> {toBn(article.readingMinutes)} মিনিট পড়া
            </span>
            <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] tracking-wider">
              <Hash size={11} /> {article.hash.slice(0, 10)}
            </span>
            <span className="flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.14em] uppercase">
              <Rss size={10.5} /> SOURCE · FB ARCHIVE
            </span>
          </div>
        </header>

        {/* hero image */}
        <figure className="mx-auto mt-10 max-w-5xl">
          <div className="frame-press overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt={article.title}
              className="photo-grade aspect-[16/8.4] w-full object-cover"
            />
          </div>
          <figcaption className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/85">
            <span>ছবি: {article.imageCredit} · প্রতীকী</span>
            <span className="font-mono-x tracking-wide">
              SHOT_{String(article.id).padStart(4, "0")}.PNG · PLAYWRIGHT CAPTURE ·
              1440×900
            </span>
          </figcaption>
        </figure>

        {/* body + sidebar */}
        <div className="mx-auto mt-12 grid max-w-6xl gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`mb-6 text-[16px] leading-[1.95] text-ink/90 ${
                  i === 0
                    ? "first-letter:float-left first-letter:mr-3 first-letter:font-serif-bn first-letter:text-[64px] first-letter:leading-[0.8] first-letter:font-black first-letter:text-alizarin"
                    : ""
                }`}
              >
                {p}
              </p>
            ))}

            {/* pull quote */}
            <blockquote className="my-10 border-y-2 border-ink py-8">
              <p className="font-serif-bn text-[22px] leading-[1.6] font-bold text-ink md:text-[26px]">
                “{article.dek}”
              </p>
              <cite className="mt-3 block font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase not-italic">
                — পুনর্লিখিত প্রতিবেদন থেকে
              </cite>
            </blockquote>

            <div className="flex items-center gap-2 border border-ink/25 bg-paper-deep/60 px-4 py-3 text-[11.5px] text-ink-soft">
              <ShieldCheck size={13} className="shrink-0 text-alizarin" />
              এই প্রতিবেদনটি ফেসবুকের উন্মুক্ত পোস্ট অবলম্বনে সংবাদ শৈলীতে
              পুনর্লিখিত; মূল পোস্টের স্ক্রিনশট আর্কাইভে সংরক্ষিত আছে।
            </div>

            {/* reader report → /api/reports → /admin/reports */}
            <div className="mt-4">
              <ReportForm articleId={article.id} />
            </div>

            {/* ad · in-article */}
            <div className="mt-10">
              <AdSlot variant="leaderboard" />
            </div>
          </div>

          {/* sidebar */}
          <aside className="lg:col-span-5">
            <div className="space-y-8 lg:sticky lg:top-20">
              <FbPost
                author={article.fbAuthor}
                sourceName={article.sourceName}
                text={article.fbExcerpt}
                time={bnTime(article.collectedAt)}
                hash={article.hash}
              />

              {/* rewrite notes */}
              <div className="border-[1.5px] border-ink p-6">
                <p className="flex items-center gap-2 font-serif-bn text-[16px] font-extrabold">
                  <FileText size={14} className="text-alizarin" />
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
              <AdSlot variant="rect" />

              {/* data discipline — fixed dark band, readable in both themes */}
              <div className="bg-band p-6 text-bandline">
                <p className="flex items-center gap-2 font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
                  <Fingerprint size={12} /> তথ্য শৃঙ্খলা
                </p>
                <dl className="mt-5 space-y-3 font-mono-x text-[11px]">
                  <div className="flex items-center justify-between border-b border-bandline/15 pb-2.5">
                    <dt className="text-bandline/50">SOURCE_POST</dt>
                    <dd className="max-w-[55%] truncate text-right text-bandline/85">
                      {article.sourceName}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-bandline/15 pb-2.5">
                    <dt className="text-bandline/50">COLLECTED_AT</dt>
                    <dd className="text-bandline/85">{bnTime(article.collectedAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-bandline/15 pb-2.5">
                    <dt className="text-bandline/50">CONTENT_HASH</dt>
                    <dd className="text-amberx">{article.hash}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-bandline/50">
                      <CalendarClock size={11} /> DEDUP_CHECK
                    </dt>
                    <dd className="text-lime">PASS · simhash 0.92</dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>
        </div>

        {/* comments */}
        <CommentsSection articleId={article.id} initial={commentRows.map(commentLite)} />

        {/* related */}
        {related.length > 0 && (
          <section className="mx-auto mt-20 max-w-[1400px] border-t-2 border-ink pt-10">
            <div className="flex items-end justify-between">
              <h2 className="font-serif-bn text-[28px] font-black md:text-[34px]">
                একই বিভাগে আরও
              </h2>
              <Link
                href="/"
                className="group flex items-center gap-2 text-[12.5px] font-bold text-ink"
              >
                সব দেখুন
                <ArrowRight
                  size={13}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a, i) => (
                <ArticleCard key={a.id} a={lite(a)} index={i} />
              ))}
            </div>
          </section>
        )}
      </article>
      <SiteFooter context="OPTION B NEWS" />
    </main>
  );
}

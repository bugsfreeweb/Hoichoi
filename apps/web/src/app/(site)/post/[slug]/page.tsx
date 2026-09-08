import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPostBySlug, relatedPosts } from "@hoichoi/db";
import { getCategories, findCategory } from "@/lib/categories-server";
import { relativeBn, readMinutesBn, shortId } from "@/lib/bn";
import { mediaUrl } from "@/lib/media";
import { CategoryBadge } from "@/components/CategoryBadge";
import { CaseStatusBadge } from "@/components/CaseStatusBadge";
import { ContentWarningGate } from "@/components/ContentWarningGate";
import { ReportButton } from "@/components/ReportButton";
import { PostCard } from "@/components/PostCard";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);
  if (!post) return { title: "পোস্টটি খুঁজে পাওয়া যায়নি" };
  return {
    title: post.title_bn,
    description: post.summary_bn ?? post.body_bn.slice(0, 160),
    openGraph: {
      title: post.title_bn,
      description: post.summary_bn ?? undefined,
      images: mediaUrl(post) ? [{ url: mediaUrl(post)!, alt: post.title_bn }] : undefined,
      publishedTime: post.published_at ?? undefined,
    },
  };
}

function paragraphize(text: string): string[] {
  return text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);
  if (!post) notFound();

  const [cats, settings, related] = await Promise.all([
    getCategories(),
    getSettings(),
    relatedPosts(post, 3),
  ]);
  const cat = await findCategory(post.category);
  const isCsa = post.category === "child-sexual-abuse";
  const showHelplines = post.category === "missing-children";
  const isMissingActive = post.category === "missing-children" && post.case_status === "active";
  const src = mediaUrl(post);
  const minutes = readMinutesBn(post.body_bn);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <nav className="text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-ink">← হোম</Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${post.category}`} className="hover:text-ink">
          {cat?.displayNameBn ?? post.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink/70">{shortId(post.slug)}</span>
      </nav>

      {isCsa && cat?.config.content_warning_text_bn ? (
        <ContentWarningGate warningText={cat.config.content_warning_text_bn}>
          <PostContent
            post={post}
            cats={cats}
            src={src}
            minutes={minutes}
            isMissingActive={isMissingActive}
            showHelplines={showHelplines}
            related={related}
            settings={settings}
          />
        </ContentWarningGate>
      ) : (
        <PostContent
          post={post}
          cats={cats}
          src={src}
          minutes={minutes}
          isMissingActive={isMissingActive}
          showHelplines={showHelplines}
          related={related}
          settings={settings}
        />
      )}
    </article>
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
  settings,
}: {
  post: Awaited<ReturnType<typeof getPublicPostBySlug>> & {};
  cats: Awaited<ReturnType<typeof getCategories>>;
  src: string | null;
  minutes: string;
  isMissingActive: boolean;
  showHelplines: boolean;
  related: Awaited<ReturnType<typeof relatedPosts>>;
  settings: Awaited<ReturnType<typeof getSettings>>;
}) {
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <CategoryBadge slug={post!.category} cats={cats} size="lg" />
        {isMissingActive && post!.case_status && <CaseStatusBadge status={post!.case_status} />}
        <span className="flex items-center gap-1 text-[11.5px] text-ink-soft">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          ঢাকা · বাংলাদেশ
        </span>
        <span className="text-[11.5px] text-ink-soft">{relativeBn(post!.published_at)}</span>
      </div>

      <h1 className="mt-6 font-serif-bn text-[32px] font-extrabold leading-[1.2] text-ink md:text-[48px] md:leading-[1.15]">
        {post!.title_bn}
      </h1>

      {src && (
        <div className="mt-8">
          <div className={`relative overflow-hidden border-[1.5px] border-ink ${post!.media_kind}`}>
            <div className="aspect-[16/8.5] overflow-hidden bg-paper-deep">
              {post!.media_kind === "video" ? (
                <video src={src} controls muted playsInline className="photo-grade h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={post!.title_bn} className="photo-grade h-full w-full object-cover" />
              )}
            </div>
            <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
              SOURCE · FACEBOOK ARCHIVE
            </span>
          </div>
          <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
            <span>ছবি: প্রতীকী</span>
            <span className="font-mono-x tracking-wide">SHOT · {shortId(post!.id).toUpperCase()} </span>
          </p>
        </div>
      )}

      <div className="mt-8 space-y-5 font-sans-bn text-[16px] leading-[1.75] text-ink md:text-[17px]">
        {paragraphize(post!.body_bn).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p className="text-[12px] text-ink-soft/80">সম্পাদকীয় নোট: এই প্রতিবেদনটি একটি সামাজিক মাধ্যম পোস্ট থেকে সংগৃহীত তথ্যের ভিত্তিতে সম্পাদকীয় পুনর্লিখন।</p>
      </div>

      <div className="mt-10 border-t border-ink/15 pt-6">
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">─── সূত্র ───</p>
        <p className="mt-3 text-[13px] text-ink">
          <span className="font-bold">লেখক:</span> <span className="font-serif-bn">{post!.original_author_name ?? "—"} </span>
          <span className="text-ink-soft">(মূল ফেসবুক পোস্টের লেখক)</span>
          <span className="mx-2">·</span>
          <span className="font-bold">সূত্র:</span> <span className="font-serif-bn">{post!.source_name}</span> (ফেসবুক পেজ) · {minutes} মিনিট পড়া
        </p>
        <Link className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-alizarin hover:text-alizarin-deep" href={post!.source_url} target="_blank" rel="noopener noreferrer nofollow">
          মূল পোস্টের লিংক →
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
        </Link>
      </div>

      <ReportButton slug={post!.slug} />

      {showHelplines && (
        <div className="mt-8 border border-ink/15 bg-paper-deep p-4">
          <p className="text-[13px] font-bold text-ink">🆘 জরুরি সহায়তা</p>
          <p className="mt-2 text-[13px] text-ink-soft">
            <Link href={`tel:${settings.police_helpline}`} className="font-mono-x font-bold text-ink hover:text-alizarin">
              {settings.police_helpline.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)}
            </Link>
            <span className="mx-2 text-ink-soft/50">·</span>
            পুলিশ হেল্পলাইন
            <span className="mx-3 text-ink-soft/50">|</span>
            <Link href={`tel:${settings.child_helpline}`} className="font-mono-x font-bold text-ink hover:text-alizarin">
              {settings.child_helpline.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)}
            </Link>
            <span className="mx-2 text-ink-soft/50">·</span>
            শিশু হেল্পলাইন
          </p>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-12">
          <p className="border-b-2 border-ink pb-2 font-serif-bn text-[20px] font-extrabold">সম্পর্কিত পোস্ট</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">{related.map((r) => <PostCard key={r.id} post={r} cats={cats} />)}</div>
        </div>
      )}
    </>
  );
}
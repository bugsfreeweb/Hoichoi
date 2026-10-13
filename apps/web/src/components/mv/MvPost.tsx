import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import clsx from "clsx";
import { getPublicPostBySlug } from "@hoichoi/db";
import { getPost, getRelated, type PostRecord } from "@/lib/mv/posts";
import { toMvPost } from "@/lib/mv/convert";
import { orderFor, enabledFor, variantFor, CHROME_KEYS, type MvLive } from "@/lib/mv/variant";
import { DEFAULT_BRAND } from "@/lib/mv/settings";
import SectionTemplate from "@/components/mv/ui/SectionTemplate";
import AdSlot from "@/components/mv/site/AdSlot";
import ReaderToolbar from "@/components/mv/post/ReaderToolbar";
import { PostFactbar, PostHero, ShareBar, ShareRail } from "@/components/mv/post/PostHero";
import {
  PostAnalytics,
  PostBody,
  PostGlance,
  PostRelated,
  PostTimeline,
  PostVerify,
} from "@/components/mv/post/PostBody";
import {
  PostComments,
  PostLesson,
  PostReport,
  ReadingCompletionSignal,
} from "@/components/mv/post/PostEngagement";

/** The mockup article-page composition, driven by the persisted variant engine. */
export default async function MvPost({ slug, live }: { slug: string; live: MvLive }) {
  const [seed, production] = await Promise.all([
    getPost(slug),
    getPublicPostBySlug(slug).catch(() => null),
  ]);
  const post: PostRecord | null = seed ?? (production ? toMvPost(production) : null);
  if (!post) notFound();
  const related = await getRelated(post.slug, post.categorySlug, 3);
  const density = DEFAULT_BRAND.density;

  const floatingShare =
    enabledFor(live, "post-share") &&
    ["rail", "floating", "sticky"].includes(variantFor(live, "post-share"));

  const render = (key: string): ReactNode => {
    if (!enabledFor(live, key)) return null;
    const variant = variantFor(live, key);
    switch (key) {
      case "post-hero":
        return <PostHero variant={variant} post={post} density={density} />;
      case "post-factbar":
        return <PostFactbar variant={variant} post={post} />;
      case "post-tools":
        return (
          <div className="mx-auto max-w-[1320px] px-5 md:px-8">
            <ReaderToolbar
              variant={variant}
              slug={post.slug}
              title={post.title}
              source={post.source}
              author={post.author}
              publishedAt={post.publishedAt}
              plainText={post.body.map((b) => String((b as { text?: string }).text ?? "")).join(" ")}
            />
          </div>
        );
      case "post-glance":
        return <PostGlance variant={variant} post={post} density={density} />;
      case "post-body":
        return (
          <>
            <PostBody variant={variant} post={post} density={density} />
            <ReadingCompletionSignal slug={post.slug} />
          </>
        );
      case "post-lesson":
        return <PostLesson variant={variant} post={post} density={density} />;
      case "post-ad":
        return <AdSlot variant={variant} density={density} />;
      case "post-timeline":
        return <PostTimeline variant={variant} post={post} density={density} />;
      case "post-verify":
        return <PostVerify variant={variant} post={post} density={density} />;
      case "post-analytics":
        return <PostAnalytics variant={variant} post={post} density={density} />;
      case "post-comments":
        return <PostComments variant={variant} post={post} density={density} />;
      case "post-report":
        return <PostReport variant={variant} post={post} density={density} />;
      case "post-share":
        return (
          <div className={clsx("mx-auto max-w-[1320px] px-5 py-8 md:px-8", floatingShare && "xl:hidden")}>
            <ShareBar post={post} variant={variant} />
          </div>
        );
      case "post-related":
        return <PostRelated variant={variant} posts={related} density={density} />;
      default:
        return null;
    }
  };

  return (
    <>
      {floatingShare ? (
        <ShareRail post={post} title={post.title} variant={variantFor(live, "post-share")} />
      ) : null}
      <main className="relative">
        {orderFor("post")
          .filter((key) => !CHROME_KEYS.includes(key))
          .map((key) => {
            const element = render(key);
            return element ? (
              <SectionTemplate key={key} sectionKey={key} variant={variantFor(live, key)}>
                {element}
              </SectionTemplate>
            ) : null;
          })}
      </main>
    </>
  );
}
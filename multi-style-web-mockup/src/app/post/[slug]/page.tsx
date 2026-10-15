import type { Metadata } from "next";
import { notFound } from "next/navigation";
import clsx from "clsx";
import Navbar from "@/components/site/Navbar";
import Ticker from "@/components/site/Ticker";
import Footer from "@/components/site/Footer";
import AdSlot from "@/components/site/AdSlot";
import { PostFactbar, PostHero, ShareBar, ShareRail } from "@/components/post/PostHero";
import {
  PostAnalytics,
  PostBody,
  PostGlance,
  PostRelated,
  PostTimeline,
  PostVerify,
} from "@/components/post/PostBody";
import { PostComments, PostLesson, PostReport, ReadingCompletionSignal } from "@/components/post/PostEngagement";
import ReaderToolbar from "@/components/post/ReaderToolbar";
import { MotionFlag, ScrollProgress } from "@/components/ui/motion";
import SectionTemplate from "@/components/ui/SectionTemplate";
import { getRenderPlan } from "@/lib/settings";
import { normalizeLogoEngine } from "@/lib/logo";
import { getPost, getRelated } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "প্রতিবেদন পাওয়া যায়নি" };
  return { title: post.title, description: post.dek };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, { map, ordered, brand }] = await Promise.all([getPost(slug), getRenderPlan("post")]);
  if (!post) notFound();
  const related = await getRelated(post.slug, post.categorySlug, 3);
  const show = (key: string) => map[key]?.visible ?? true;
  const variant = (key: string) => map[key]?.variant ?? "";
  const content = ordered.filter((item) => !["ticker", "navbar", "footer"].includes(item.key));
  const floatingShare = show("post-share") && ["rail", "floating", "sticky"].includes(variant("post-share"));

  return (
    <>
      <MotionFlag enabled={brand.motion} accent={brand.accent} />
      <ScrollProgress />
      {show("ticker") ? <Ticker variant={variant("ticker")} /> : null}
      {show("navbar") ? <Navbar variant={variant("navbar")} engine={normalizeLogoEngine(map.navbar?.config?.logoEngine)} /> : null}
      {floatingShare ? <ShareRail post={post} title={post.title} variant={variant("post-share")} /> : null}

      <main>
        {content.map((section) => {
          const element = (() => {
            switch (section.key) {
              case "post-hero":
                return show(section.key) ? <PostHero variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-factbar":
                return show(section.key) ? <PostFactbar variant={section.variant} post={post} /> : null;
              case "post-tools":
                return show(section.key) ? (
                  <div className="mx-auto max-w-[1320px] px-5 md:px-8">
                    <ReaderToolbar
                      variant={section.variant}
                      slug={post.slug}
                      title={post.title}
                      source={post.source}
                      author={post.author}
                      publishedAt={post.publishedAt}
                      plainText={post.body.map((b) => String((b as { text?: string }).text ?? "")).join(" ")}
                    />
                  </div>
                ) : null;
              case "post-glance":
                return show(section.key) ? <PostGlance variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-body":
                return show(section.key) ? <><PostBody variant={section.variant} post={post} density={brand.density} /><ReadingCompletionSignal slug={post.slug} /></> : null;
              case "post-lesson":
                return show(section.key) ? <PostLesson variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-ad":
                return show(section.key) ? <AdSlot variant={section.variant} config={map[section.key]?.config} density={brand.density} /> : null;
              case "post-timeline":
                return show(section.key) ? <PostTimeline variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-verify":
                return show(section.key) ? <PostVerify variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-analytics":
                return show(section.key) ? <PostAnalytics variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-comments":
                return show(section.key) ? <PostComments variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-report":
                return show(section.key) ? <PostReport variant={section.variant} post={post} density={brand.density} /> : null;
              case "post-share":
                return show(section.key) ? <div className={clsx("mx-auto max-w-[1320px] px-5 py-8 md:px-8", floatingShare && "xl:hidden")}><ShareBar post={post} variant={section.variant} /></div> : null;
              case "post-related":
                return show(section.key) ? <PostRelated variant={section.variant} posts={related} density={brand.density} /> : null;
              default:
                return null;
            }
          })();
          return element ? <SectionTemplate key={section.key} sectionKey={section.key} variant={section.variant}>{element}</SectionTemplate> : null;
        })}
      </main>

      {show("footer") ? <Footer variant={variant("footer")} engine={normalizeLogoEngine(map.footer?.config?.logoEngine)} /> : null}
    </>
  );
}

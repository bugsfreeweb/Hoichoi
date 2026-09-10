import { windowPosts } from "@hoichoi/db";
import { getCategories } from "@/lib/categories-server";
import { HeroPostCard } from "@/components/HeroPostCard";
import { LiveDeskMonitor } from "@/components/LiveDeskMonitor";
import { MostReadList } from "@/components/MostReadList";
import { CategoryMarquee } from "@/components/CategoryMarquee";
import { CollectionGrid } from "@/components/CollectionGrid";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { ScrollProgress } from "@/components/ScrollProgress";
import { RewriteComparator } from "@/components/RewriteComparator";
import { AdSlot } from "@/components/AdSlot";
import { HomeLiveProvider } from "@/components/home/live-data";
import LiveAnalytics from "@/components/home/live-analytics";
import { getSettings } from "@/lib/settings";

export const revalidate = 300;

export default async function HomePage() {
  const [posts, cats, settings] = await Promise.all([
    windowPosts({ limit: 30 }),
    getCategories(),
    getSettings(),
  ]);
  const lead = posts[0];

  return (
    <>
      <ScrollProgress />
      <section className="mx-auto max-w-site px-4 md:px-8">
        <div className="grid gap-10 border-y-2 border-ink py-8 lg:grid-cols-12 lg:py-10">
          {lead ? (
            <HeroPostCard post={lead} cats={cats} />
          ) : (
            <div className="lg:col-span-8">
              <p className="font-serif-bn text-[30px] font-extrabold text-ink">
                আপাতত কোনো সংবাদ নেই — প্রথম পাইপলাইন রান আপনার অপেক্ষায়।
              </p>
            </div>
          )}
          <aside className="lg:col-span-4">
            <div className="flex h-full flex-col gap-6 lg:border-l lg:border-ink/15 lg:pl-8">
              <LiveDeskMonitor />
              <MostReadList cats={cats} />
            </div>
          </aside>
        </div>
      </section>

      <HomeLiveProvider>
        <AdSlot variant="leaderboard" html={settings.ad_leaderboard_html} />
        <LiveAnalytics />
      </HomeLiveProvider>

      <CategoryMarquee />

      {lead && (
        <section className="mx-auto max-w-site px-4 py-14 md:px-8 md:py-18">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">▚ RAW FEED → BENGALI EDITORIAL · দেখুন পার্থক্য</p>
              <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">একই ঘটনা — দুই জগত</h2>
            </div>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-soft">
              বামে ফেসবুকে সোর্স-পোস্ট যেমন করে পড়ে আসছিল, ডানে সেই একই ঘটনা হৈচৈয়ের
              সম্পাদকীয় শৈলীতে — বানান ঠিক, নাম গোপন, শিরোনামে শুধু ঘটনা।
            </p>
          </div>
          <RewriteComparator post={lead} />
        </section>
      )}

      <section className="mx-auto max-w-site px-4 py-14 md:px-8 md:py-18">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">▚ TODAY'S COLLECTION · AUTO-CURATED</p>
            <h2 className="mt-2 font-serif-bn text-[34px] font-black text-ink md:text-[44px]">আজকের হৈচৈ</h2>
          </div>
          <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-soft">
            প্রতিটি আইটেম ফেসবুক থেকে সংগৃহীত, হ্যাশ-ফিঙ্গারপ্রিন্টে ডুপ্লিকেট যাচাই সম্পন্ন এবং বাংলা সম্পাদকীয় শৈলীতে পুনর্লিখিত।
          </p>
        </div>
        <CollectionGrid posts={posts} cats={cats} adInfeedHtml={settings.ad_infeed_html} />
      </section>

      <PipelineDiagram />

      <section className="mx-auto max-w-site px-4 pb-14 md:px-8">
        <AdSlot variant="strip" html={settings.ad_strip_html} />
      </section>
    </>
  );
}
import type { Metadata } from "next";
import Navbar from "@/components/site/Navbar";
import Ticker from "@/components/site/Ticker";
import Footer from "@/components/site/Footer";
import AdSlot from "@/components/site/AdSlot";
import Hero from "@/components/home/Hero";
import Kpi, { type Totals } from "@/components/home/Kpi";
import Insights from "@/components/home/Insights";
import Pipeline from "@/components/home/Pipeline";
import Lead from "@/components/home/Lead";
import Latest from "@/components/home/Latest";
import { Categories, SystemHealth, Newsletter } from "@/components/home/Major";
import { Academy, Briefing, LiveWire } from "@/components/home/Extras";
import { MotionFlag, ScrollProgress } from "@/components/ui/motion";
import SectionTemplate from "@/components/ui/SectionTemplate";
import { getRenderPlan } from "@/lib/settings";
import { normalizeLogoEngine } from "@/lib/logo";
import { listPosts } from "@/lib/posts";
import { SYNC_SERIES } from "@/lib/data";

export const metadata: Metadata = {
  title: "হৈচৈ · শহরের হৈচৈ, সংবাদের ভাষায়",
  description:
    "হৈচৈ নিউজরুম — ফিড থেকে সংগ্রহ, হ্যাশ-ডুপ্লিকেট গেট, ফ্যাক্ট-গেট পুনর্লিখন আর লাইভ ডেটা ইনসাইট এক জায়গায়।",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ map, ordered, brand }, posts] = await Promise.all([getRenderPlan("home"), listPosts(12)]);
  const last = SYNC_SERIES[SYNC_SERIES.length - 1];
  const totals: Totals = {
    collected: last.collected,
    published: last.published,
    dupes: last.dupes,
    comments: last.comments + posts.reduce((sum, post) => sum + post.comments, 0),
  };
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const rest = posts.filter((post) => post.slug !== featured?.slug);
  const show = (key: string) => map[key]?.visible ?? true;
  const variant = (key: string) => map[key]?.variant ?? "";
  const content = ordered.filter((item) => !["ticker", "navbar", "footer"].includes(item.key));

  return (
    <>
      <MotionFlag enabled={brand.motion} accent={brand.accent} />
      <ScrollProgress />
      {show("ticker") ? <Ticker variant={variant("ticker")} /> : null}
      {show("navbar") ? <Navbar variant={variant("navbar")} engine={normalizeLogoEngine(map.navbar?.config?.logoEngine)} /> : null}

      <main>
        {content.map((section) => {
          const element = (() => {
            switch (section.key) {
              case "hero":
                return show("hero") ? <Hero variant={section.variant} density={brand.density} totals={totals} /> : null;
              case "kpi":
                return show("kpi") ? <Kpi variant={section.variant} density={brand.density} totals={totals} /> : null;
              case "insights":
                return show("insights") ? <Insights variant={section.variant} density={brand.density} /> : null;
              case "pipeline":
                return show("pipeline") ? <Pipeline variant={section.variant} density={brand.density} /> : null;
              case "wire":
                return show("wire") ? <LiveWire variant={section.variant} density={brand.density} /> : null;
              case "briefing":
                return show("briefing") ? <Briefing variant={section.variant} density={brand.density} posts={posts} /> : null;
              case "lead":
                return show("lead") && featured ? <Lead variant={section.variant} density={brand.density} post={featured} /> : null;
              case "latest":
                return show("latest") ? <Latest variant={section.variant} density={brand.density} posts={rest} /> : null;
              case "home-ad":
                return show("home-ad") ? <AdSlot variant={section.variant} density={brand.density} config={map[section.key]?.config} /> : null;
              case "academy":
                return show("academy") ? <Academy variant={section.variant} density={brand.density} /> : null;
              case "categories":
                return show("categories") ? <Categories variant={section.variant} density={brand.density} /> : null;
              case "health":
                return show("health") ? <SystemHealth variant={section.variant} density={brand.density} /> : null;
              case "newsletter":
                return show("newsletter") ? <Newsletter variant={section.variant} density={brand.density} /> : null;
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

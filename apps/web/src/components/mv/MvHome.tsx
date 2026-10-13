import type { ReactNode } from "react";
import { DEFAULT_BRAND } from "@/lib/mv/settings";
import { listPosts } from "@/lib/mv/posts";
import { orderFor, enabledFor, variantFor, CHROME_KEYS, type MvLive } from "@/lib/mv/variant";
import SectionTemplate from "@/components/mv/ui/SectionTemplate";
import AdSlot from "@/components/mv/site/AdSlot";
import Hero from "@/components/mv/home/Hero";
import Kpi, { type Totals } from "@/components/mv/home/Kpi";
import Insights from "@/components/mv/home/Insights";
import Pipeline from "@/components/mv/home/Pipeline";
import Lead from "@/components/mv/home/Lead";
import Latest from "@/components/mv/home/Latest";
import { Categories, Newsletter, SystemHealth } from "@/components/mv/home/Major";
import { Academy, Briefing, LiveWire } from "@/components/mv/home/Extras";

/** The mockup home page composition, driven by the persisted variant engine. */
export default async function MvHome({ live }: { live: MvLive }) {
  const posts = await listPosts(12);
  const featured = posts.find((p) => p.featured) ?? posts[0] ?? null;
  const rest = posts.filter((p) => p.slug !== featured?.slug);
  const totals: Totals = {
    collected: 12480,
    published: 940,
    dupes: 214,
    comments: posts.reduce((sum, p) => sum + p.comments, 0),
  };
  const density = DEFAULT_BRAND.density;

  const render = (key: string): ReactNode => {
    if (!enabledFor(live, key)) return null;
    const variant = variantFor(live, key);
    switch (key) {
      case "hero":
        return <Hero variant={variant} density={density} totals={totals} />;
      case "kpi":
        return <Kpi variant={variant} density={density} totals={totals} />;
      case "insights":
        return <Insights variant={variant} density={density} />;
      case "pipeline":
        return <Pipeline variant={variant} density={density} />;
      case "wire":
        return <LiveWire variant={variant} density={density} />;
      case "briefing":
        return <Briefing variant={variant} density={density} posts={posts} />;
      case "lead":
        return featured ? <Lead variant={variant} density={density} post={featured} /> : null;
      case "latest":
        return <Latest variant={variant} density={density} posts={rest} />;
      case "home-ad":
        return <AdSlot variant={variant} density={density} />;
      case "academy":
        return <Academy variant={variant} density={density} />;
      case "categories":
        return <Categories variant={variant} density={density} />;
      case "health":
        return <SystemHealth variant={variant} density={density} />;
      case "newsletter":
        return <Newsletter variant={variant} density={density} />;
      default:
        return null;
    }
  };

  return (
    <main className="relative">
      {orderFor("home")
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
  );
}
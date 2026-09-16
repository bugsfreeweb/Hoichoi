import { Footer } from "@/components/Footer";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TopBar } from "@/components/TopBar";
import { getSettings } from "@/lib/settings";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.site_name,
    description: s.slogan_bn ? `${s.slogan_bn}. ${s.tagline}` : undefined,
    icons: s.favicon_url ? { icon: s.favicon_url } : undefined,
  };
}

/** পাবলিক সাইট শেল — টপ বার, টিকার, ফুটার। */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-chrome">
      <TopBar />
      <BreakingTicker />
      {children}
      <Footer />
    </div>
  );
}
import { Footer } from "@/components/Footer";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TopBar } from "@/components/TopBar";
import { NoticeBanner } from "@/components/NoticeBanner";
import { getSettings } from "@/lib/settings";
import { getSpecialNotice, parseAppConfig } from "@hoichoi/db";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.site_name,
    description: s.slogan_bn ? `${s.slogan_bn}. ${s.tagline}` : undefined,
    icons: s.favicon_url ? { icon: s.favicon_url } : undefined,
  };
}

/** পাবলিক সাইট শেল — টপ বার, টিকার, স্পেশাল নোটিশ, ফুটার। */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, specialNotice] = await Promise.all([getSettings(), getSpecialNotice()]);
  const themeDefault = parseAppConfig(settings.app_config_json).theme_default ?? "light";
  return (
    <div className="page-chrome">
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{if(localStorage.getItem("hoichoi-theme-explicit")!=="1"){document.documentElement.setAttribute("data-theme","${themeDefault}")}}catch(e){}})();`,
        }}
      />
      <TopBar />
      <BreakingTicker />
      <NoticeBanner notice={specialNotice} />
      {children}
      <Footer />
    </div>
  );
}
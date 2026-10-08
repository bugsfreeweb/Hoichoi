import { Footer } from "@/components/Footer";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TopBar } from "@/components/TopBar";
import { NoticeBanner } from "@/components/NoticeBanner";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getSpecialNotice, parseAppConfig } from "@hoichoi/db";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const cfg = parseAppConfig(s.app_config_json);
  // A visitor only sees the maintenance page, so the whole site is taken off
  // search engines while it is up. Signed-in admins previewing the site do not
  // trigger this.
  const inMaintenance = cfg.maintenance_mode && !(await currentUser());
  return {
    title: s.site_name,
    description: s.slogan_bn ? `${s.slogan_bn}. ${s.tagline}` : undefined,
    icons: s.favicon_url ? { icon: s.favicon_url } : undefined,
    ...(inMaintenance ? { robots: { index: false, follow: false } as const } : {}),
  };
}

/** পাবলিক সাইট শেল — টপ বার, টিকার, স্পেশাল নোটিশ, ফুটার। */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, specialNotice] = await Promise.all([getSettings(), getSpecialNotice()]);
  const cfg = parseAppConfig(settings.app_config_json);
  const themeDefault = cfg.theme_default ?? "light";
  // Maintenance mode: logged-out visitors get a full-screen notice instead of
  // the news chrome. The admin session bypasses it (cookie read + DB join only
  // happens when maintenance_mode is actually on, keeping the happy path cheap).
  if (cfg.maintenance_mode && !(await currentUser())) {
    return (
      <div className="page-chrome">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("hoichoi-theme-explicit")!=="1"){document.documentElement.setAttribute("data-theme","${themeDefault}")}}catch(e){}})();`,
          }}
        />
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="font-mono-x text-[10.5px] uppercase tracking-[0.3em] text-alizarin">Maintenance</p>
            <h1 className="mt-3 font-serif-bn text-[40px] font-black text-ink md:text-[48px]">{settings.site_name}</h1>
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
              সাইটটি সংক্ষিপ্ত রক্ষণাবেক্ষণের জন্য বন্ধ রয়েছে।
              <br />
              খুব শীঘ্রই সব সংবাদ আবার চালু হবে।
            </p>
          </div>
        </main>
      </div>
    );
  }
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
      {cfg.show_footer && <Footer />}
    </div>
  );
}
import { Footer } from "@/components/Footer";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TopBar } from "@/components/TopBar";
import { NoticeBanner } from "@/components/NoticeBanner";
import { MaintenanceScreen } from "@/components/maintenance/MaintenanceScreen";
import TrafficTracker from "@/components/TrafficTracker";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { countReviewQueues, getSpecialNotice, parseAppConfig, recentPipelineRuns, statsSnapshot } from "@hoichoi/db";
import { getLive } from "@/lib/mv/live";
import { isMvMode } from "@/lib/mv/variant";
import { buildMvData } from "@/lib/mv/live-data";
import { EMPTY_MV_DATA } from "@/lib/mv/data";
import MvChrome from "@/components/mv/MvChrome";
import { MvDataProvider } from "@/components/mv/ui/mv-data";
import ScrollToTop from "@/components/ScrollToTop";
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
    const [stats, queues, runs] = await Promise.all([
      statsSnapshot().catch(() => null),
      countReviewQueues().catch(() => null),
      recentPipelineRuns(1).catch(() => []),
    ]);
    return (
      <div className="page-chrome">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("hoichoi-theme-explicit")!=="1"){document.documentElement.setAttribute("data-theme","${themeDefault}")}}catch(e){}})();`,
          }}
        />
        <MaintenanceScreen
          config={cfg.maintenance}
          lastRunIso={runs[0]?.started_at ?? null}
          stats={
            stats && queues
              ? {
                  collectedToday: stats.collectedToday,
                  published: stats.published,
                  duplicates: stats.duplicatesBlocked,
                  pendingComments: queues.pending_comments,
                }
              : null
          }
        />
      </div>
    );
  }
  // Mockup design engine: when the admin picks any non-default variant, the
  // whole site renders the scoped [data-mv] chrome around the page content.
  // A signed-in admin with the short-lived preview cookie sees their in-memory
  // design draft — every section's variant *and* show/hide state — rendered
  // live without it being persisted to settings.
  const live = await getLive().catch(() => null);
  if (live && isMvMode(live)) {
    // Real DB bundle so the alternate design variants render production
    // content; falls back to an empty state if the DB is unreachable.
    const mvData = await buildMvData().catch(() => EMPTY_MV_DATA);
    return (
      <MvDataProvider value={mvData}>
        <MvChrome live={live} accent={settings.accent_color}>
          <TrafficTracker />
          {children}
        </MvChrome>
      </MvDataProvider>
    );
  }
  return (
    <div className="page-chrome">
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{if(localStorage.getItem("hoichoi-theme-explicit")!=="1"){document.documentElement.setAttribute("data-theme","${themeDefault}")}}catch(e){}})();`,
        }}
      />
      <TrafficTracker />
      <TopBar pipelineHours={settings.pipeline_hours} />
      <BreakingTicker />
      <NoticeBanner notice={specialNotice} />
      {children}
      {cfg.show_footer && <Footer />}
      <ScrollToTop />
    </div>
  );
}
import { Footer } from "@/components/Footer";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TopBar } from "@/components/TopBar";
import { NoticeBanner } from "@/components/NoticeBanner";
import { MaintenanceScreen } from "@/components/maintenance/MaintenanceScreen";
import TrafficTracker from "@/components/TrafficTracker";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { countReviewQueues, getSpecialNotice, parseAppConfig, recentPipelineRuns, statsSnapshot } from "@hoichoi/db";
import { loadLive } from "@/lib/mv/live";
import { isMvMode } from "@/lib/mv/variant";
import MvChrome from "@/components/mv/MvChrome";
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
  const live = await loadLive().catch(() => null);
  if (live && isMvMode(live)) {
    return (
      <MvChrome live={live} accent={settings.accent_color}>
        <TrafficTracker />
        {children}
      </MvChrome>
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
    </div>
  );
}
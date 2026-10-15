import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/store";
import { THEME_MAP, themeName } from "@/lib/themes";
import { loc } from "@/lib/types";
import { ThemeView } from "@/components/themes/registry";
import { VisitTracker } from "@/components/blocks";
import { Dock } from "@/components/Dock";
import { LiveSite } from "@/components/LiveSite";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.seo.title,
    description: s.seo.description,
    robots: s.seo.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

/**
 * Reliable maintenance gate:
 *  1. explicit "live" mode (or valid bypass key) → front page
 *  2. scheduled window active → maintenance, regardless of mode
 *  3. schedule expired + autoLive → front page
 *  4. otherwise follow the stored mode
 */
export default async function VisitorHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await getSettings();
  const params = await searchParams;
  const bypass = typeof params.bypass === "string" ? params.bypass : "";
  const bypassed = Boolean(bypass) && bypass === s.security.bypassKey;

  const now = Date.now();
  const start = new Date(s.schedule.start).getTime();
  const end = new Date(s.schedule.end).getTime();
  const inWindow = s.schedule.enabled && !Number.isNaN(start) && !Number.isNaN(end) && now >= start && now <= end;
  const windowPassed = s.schedule.enabled && !Number.isNaN(end) && now > end;

  const showLive =
    bypassed || s.mode === "live" || (!inWindow && windowPassed && s.schedule.autoLive);

  if (showLive && !inWindow) return <LiveSite s={s} />;

  const meta = THEME_MAP[s.activeTheme];
  const L = loc(s);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden" style={{ background: s.colors.bg }}>
      <ThemeView id={s.activeTheme} s={s} />
      <VisitTracker theme={s.activeTheme} path="/" enabled={s.analytics.enabled} />

      {s.ui.showThemeBadge && (
        <div className="pointer-events-none fixed top-4 left-1/2 z-40 -translate-x-1/2">
          <span className="font-mono-x rounded-full border border-[#1a140d] bg-[#1a140d]/85 px-3 py-1 text-[10px] tracking-[0.22em] text-[#c8f65d] uppercase backdrop-blur">
            {themeName(meta, L)} · {s.mode.replace("-", " ")}
            {inWindow ? " · scheduled" : ""}
          </span>
        </div>
      )}

      {s.ui.showDock && <Dock s={s} />}

      <noscript>
        <div className="fixed inset-x-0 bottom-0 z-40 bg-[#1a140d] p-4 text-center text-sm text-[#f3eee1]">
          <Link href="/designs" className="underline">
            {L === "bn" ? "অন্যান্য ডিজাইন দেখুন" : "Browse other designs"}
          </Link>
        </div>
      </noscript>
    </main>
  );
}

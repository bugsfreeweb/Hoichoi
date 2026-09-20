"use client";

/**
 * Shared advertisement configuration & analytics for the demo.
 * Persisted to localStorage so the same settings drive the public site,
 * the web admin manager and the desktop controller.
 */

export type AdPlacement = "leaderboard" | "rect" | "infeed" | "strip";

export type AdConfig = {
  enabled: boolean;
  placements: Record<AdPlacement, boolean>;
  sponsor: string;
  headline: string;
  sub: string;
  cta: string;
  link: string;
  html: string;
};

export type AdAnalytics = {
  impressions: Record<AdPlacement, number>;
  clicks: Record<AdPlacement, number>;
};

const AD_CONFIG_KEY = "hoichoi-ads-config";
const AD_ANALYTICS_KEY = "hoichoi-ad-analytics";

export const AD_PLACEMENTS: AdPlacement[] = [
  "leaderboard",
  "rect",
  "infeed",
  "strip",
];

export const AD_PLACEMENT_LABEL: Record<AdPlacement, string> = {
  leaderboard: "লিডারবোর্ড (সবের উপরে)",
  rect: "রেক্ট্যাঙ্গেল (আর্টিকেল সাইড)",
  infeed: "ইন-ফিড (গ্রিডের মধ্যে)",
  strip: "স্ট্রিপ (ফুটারের আগে)",
};

export const DEFAULT_AD_CONFIG: AdConfig = {
  enabled: true,
  placements: { leaderboard: true, rect: true, infeed: true, strip: true },
  sponsor: "হৈচৈ লাইভ",
  headline: "আপনার বিজ্ঞাপন এখানে",
  sub: "হৈচৈ পাঠকের কাছে সরাসরি পৌঁছান — ads@hoichoi.example",
  cta: "স্পনসর হোন",
  link: "",
  html: "",
};

const emptyCounts = (): Record<AdPlacement, number> => ({
  leaderboard: 0,
  rect: 0,
  infeed: 0,
  strip: 0,
});

export function emptyAnalytics(): AdAnalytics {
  return { impressions: emptyCounts(), clicks: emptyCounts() };
}

function normalizeAdConfig(p: Partial<AdConfig>): AdConfig {
  const d = DEFAULT_AD_CONFIG;
  const placements: Record<AdPlacement, boolean> = { ...d.placements };
  if (p.placements) {
    for (const k of AD_PLACEMENTS) {
      if (typeof p.placements[k] === "boolean") placements[k] = p.placements[k];
    }
  }
  return {
    enabled: typeof p.enabled === "boolean" ? p.enabled : d.enabled,
    placements,
    sponsor:
      typeof p.sponsor === "string" && p.sponsor.trim().length
        ? p.sponsor
        : d.sponsor,
    headline:
      typeof p.headline === "string" && p.headline.trim().length
        ? p.headline
        : d.headline,
    sub: typeof p.sub === "string" && p.sub.trim().length ? p.sub : d.sub,
    cta: typeof p.cta === "string" && p.cta.trim().length ? p.cta : d.cta,
    link: typeof p.link === "string" ? p.link : "",
    html: typeof p.html === "string" ? p.html : "",
  };
}

export function readAdConfig(): AdConfig {
  try {
    const raw = localStorage.getItem(AD_CONFIG_KEY);
    if (raw) return normalizeAdConfig(JSON.parse(raw) as Partial<AdConfig>);
  } catch {
    /* ignore */
  }
  return normalizeAdConfig({});
}

export function saveAdConfig(config: AdConfig): void {
  try {
    localStorage.setItem(AD_CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

export function resetAdConfig(): AdConfig {
  try {
    localStorage.removeItem(AD_CONFIG_KEY);
  } catch {
    /* ignore */
  }
  return normalizeAdConfig({});
}

/** Is this slot allowed to render right now (global + placement)? */
export function adEnabledFor(variant: AdPlacement): boolean {
  const cfg = readAdConfig();
  return cfg.enabled && cfg.placements[variant];
}

export function readAnalytics(): AdAnalytics {
  const base = emptyAnalytics();
  try {
    const raw = localStorage.getItem(AD_ANALYTICS_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<AdAnalytics>;
      for (const k of AD_PLACEMENTS) {
        base.impressions[k] = Number(v.impressions?.[k]) || 0;
        base.clicks[k] = Number(v.clicks?.[k]) || 0;
      }
    }
  } catch {
    /* ignore */
  }
  return base;
}

function saveAnalytics(a: AdAnalytics): void {
  try {
    localStorage.setItem(AD_ANALYTICS_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

export function countImpression(variant: AdPlacement): void {
  const a = readAnalytics();
  a.impressions[variant] += 1;
  saveAnalytics(a);
}

export function countClick(variant: AdPlacement): void {
  const a = readAnalytics();
  a.clicks[variant] += 1;
  saveAnalytics(a);
}

export function resetAnalytics(): void {
  try {
    localStorage.removeItem(AD_ANALYTICS_KEY);
  } catch {
    /* ignore */
  }
}

export function analyticsTotals(a: AdAnalytics): {
  impressions: number;
  clicks: number;
} {
  let impressions = 0;
  let clicks = 0;
  for (const k of AD_PLACEMENTS) {
    impressions += a.impressions[k];
    clicks += a.clicks[k];
  }
  return { impressions, clicks };
}
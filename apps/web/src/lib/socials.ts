import type { FooterSocialLink, SiteAppConfig } from "@hoichoi/shared-types";

/** The social keys the maintenance screen has always supported. */
const MAINTENANCE_KEYS = ["facebook", "x", "instagram", "youtube", "github", "linkedin"] as const;

const LABELS: Record<string, string> = {
  facebook: "Facebook",
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  github: "GitHub",
  rss: "RSS",
  mail: "Email",
  link: "লিংক",
};

/**
 * One source of truth for footer social links.
 *
 * The admin edits `footer_socials` under Settings → Footer, but the maintenance
 * screen has its own legacy `maintenance.socials` record. Before this helper,
 * editing the global list changed only the default theme's footer: the mockup
 * themes showed a hardcoded list and maintenance mode showed the old record, so
 * an operator had to update three places and still saw stale links.
 *
 * Global `footer_socials` wins whenever it has entries (that is what the
 * settings page says it does). Only when it is empty do we fall back to the
 * maintenance record, so existing installs keep whatever they configured.
 */
export function resolveFooterSocials(cfg: SiteAppConfig | null | undefined): FooterSocialLink[] {
  const global = cfg?.footer_socials ?? [];
  if (global.length > 0) return global.filter((l) => Boolean(l.url?.trim()));

  const legacy = cfg?.maintenance?.socials;
  if (!legacy) return [];
  return MAINTENANCE_KEYS.filter((key) => Boolean(legacy[key]?.trim())).map((key) => ({
    icon: key,
    label: LABELS[key] ?? key,
    url: legacy[key]!,
  }));
}

/** Icon key → readable label for footers that show a text pill instead of an SVG. */
export function socialLabel(link: FooterSocialLink): string {
  return link.label?.trim() || LABELS[link.icon] || LABELS.link!;
}

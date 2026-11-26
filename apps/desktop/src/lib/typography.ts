import { banglaFontStack } from "@hoichoi/bangla-fonts";
import type { SiteTypography } from "@hoichoi/shared-types";

/**
 * Point the desk's CSS tokens at the shared site choice.
 *
 * The desk has a local `--desk-font` override for body copy. Headlines and
 * tags/categories follow the site because editors expect the article they are
 * reviewing to look like the article readers will get.
 */
export function applyTypography(typography?: Partial<SiteTypography> | null): void {
  const root = document.documentElement.style;
  root.setProperty(
    "--font-serif-bn",
    banglaFontStack(typography?.headline, "Noto Serif Bengali", "serif"),
  );
  root.setProperty(
    "--font-sans-bn",
    banglaFontStack(typography?.body, "Hind Siliguri", "sans-serif"),
  );
  root.setProperty(
    "--font-meta-bn",
    banglaFontStack(typography?.meta || typography?.body, "Hind Siliguri", "sans-serif"),
  );
  root.setProperty(
    "--font-desk-bn",
    banglaFontStack(typography?.desk || typography?.body, "Hind Siliguri", "sans-serif"),
  );
}

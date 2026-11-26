import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
// Fonts are self-hosted (see `fonts.css` + `public/fonts/`) so the production
// build never depends on a live fonts.googleapis.com fetch. The @font-face
// rules and their exact `unicode-range` subsets are the ones Google served.
import "@hoichoi/bangla-fonts/fonts.css";
import "./fonts.css";
import "./globals.css";
import { siteUrl } from "../lib/site";
import { getSettings, parseAppConfig } from "@hoichoi/db";
import { banglaFontStack } from "@hoichoi/bangla-fonts";
import { getLocale } from "../lib/locale";
import { LocaleProvider } from "../components/i18n/LocaleProvider";

const SITE_URL = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "হৈচৈ। — ভাইরাল বাংলা, সপ্তাহখানেক",
    template: "%s · হৈচৈ।",
  },
  description:
    "হৈচৈ — অটো-কিউরেটেড বাংলা সংবাদ ডেস্ক। ফেসবুকের ভাইরাল পোস্ট সাত দিনের জানালায় সচেতনতামূলক সংবাদ আকারে পুনর্লিখিত।",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "হৈচৈ।",
    locale: "bn_BD",
    url: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The reader's language is decided once, on the server, before anything paints:
  // a reader who chose English never sees a flash of Bangla.
  const [locale, settings] = await Promise.all([
    getLocale(),
    getSettings().catch(() => null),
  ]);
  const cfg = parseAppConfig(settings?.app_config_json);
  // Apply the type library at the root so the public site and the admin console
  // read the same choice. The admin gallery writes these exact ids.
  const type = cfg.typography;
  const serif = (id?: string) =>
    banglaFontStack(id || type?.headline, "Noto Serif Bengali", "serif");
  const sans = (id?: string) =>
    banglaFontStack(id || type?.body, "Hind Siliguri", "sans-serif");
  /**
   * Three legacy slots plus the per-surface slots. Every new slot falls back to
   * the old one, so an operator who chooses nothing sees exactly the typography
   * they had before this model existed.
   */
  const typeStyle = {
    "--font-serif-bn": serif(),
    "--font-sans-bn": sans(),
    "--font-meta-bn": banglaFontStack(type?.meta || type?.body, "Hind Siliguri", "sans-serif"),
    "--font-page-title-bn": serif(type?.pageTitle),
    "--font-subtitle-bn": sans(type?.subtitle),
    "--font-header-bn": sans(type?.header),
    "--font-footer-bn": sans(type?.footer),
    "--font-sidebar-bn": sans(type?.sidebar),
    "--font-comments-bn": sans(type?.comments),
    "--font-reports-bn": sans(type?.reports),
    "--font-admin-bn": sans(type?.admin),
    "--font-desk-bn": sans(type?.desk),
  } as React.CSSProperties;
  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning style={typeStyle}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("hoichoi-theme");if(t!=="dark"&&t!=="light"){t="light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();document.documentElement.classList.add('js');`,
          }}
        />
      </head>
      <body className="grain">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
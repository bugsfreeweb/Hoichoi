import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
// Fonts are self-hosted (see `fonts.css` + `public/fonts/`) so the production
// build never depends on a live fonts.googleapis.com fetch. The @font-face
// rules and their exact `unicode-range` subsets are the ones Google served.
import "./fonts.css";
import "./globals.css";
import { siteUrl } from "../lib/site";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" dir="ltr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("hoichoi-theme");if(t!=="dark"&&t!=="light"){t="light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();document.documentElement.classList.add('js');`,
          }}
        />
      </head>
      <body className="grain">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
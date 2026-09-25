import type { Metadata } from "next";
import { Hind_Siliguri, JetBrains_Mono, Noto_Serif_Bengali, Space_Grotesk } from "next/font/google";
import "./globals.css";

const serifBn = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-serif-bn",
});

const sansBn = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-bn",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

const SITE_URL =
  process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://hoichoi.local";

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
      <body
        className={`${serifBn.variable} ${sansBn.variable} ${grotesk.variable} ${mono.variable} grain`}
      >
        {children}
      </body>
    </html>
  );
}
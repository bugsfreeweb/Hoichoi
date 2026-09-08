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
    default: "হইচই। — ভাইরাল বাংলা, সপ্তাহখানেক",
    template: "%s · হইচই।",
  },
  description:
    "হইচই — অটো-কিউরেটেড বাংলা সংবাদ ডেস্ক। ফেসবুকের ভাইরাল পোস্ট সাত দিনের জানালায় সচেতনতামূলক সংবাদ আকারে পুনর্লিখিত।",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "হইচই।",
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
    <html lang="bn" dir="ltr">
      <body
        className={`${serifBn.variable} ${sansBn.variable} ${grotesk.variable} ${mono.variable} grain`}
      >
        {children}
      </body>
    </html>
  );
}
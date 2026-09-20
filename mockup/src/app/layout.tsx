import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Noto_Serif_Bengali,
  Hind_Siliguri,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import ModeChrome from "@/components/chrome";
import { BRAND } from "@/lib/brand";

const notoBn = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-bn",
  display: "swap",
});

const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jb",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hoichoi.example"),
  title: `${BRAND.bn} — অটো-কিউরেটেড সংবাদ ডেস্ক`,
  description: `${BRAND.tagline}. ${BRAND.pipeline}.`,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/images/hoichoi-mark.png", type: "image/png" },
    ],
    apple: "/images/hoichoi-mark.png",
  },
  openGraph: {
    title: `${BRAND.bn} — অটো-কিউরেটেড সংবাদ ডেস্ক`,
    description: BRAND.tagline,
    images: [{ url: "/images/hoichoi-mark.png", alt: BRAND.desk }],
  },
  twitter: { card: "summary", images: ["/images/hoichoi-mark.png"] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="bn"
      className={`${notoBn.variable} ${hind.variable} ${grotesk.variable} ${jbMono.variable}`}
    >
      <body className="font-sans-bn grain bg-paper text-ink antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var t=localStorage.getItem('hoichoi-theme');" +
              "t=t||(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');" +
              "document.documentElement.setAttribute('data-theme',t);" +
              "document.documentElement.classList.add('js');" +
              "document.documentElement.classList.add('reveal-armed');",
          }}
        />
        <ModeChrome />
        {children}
      </body>
    </html>
  );
}

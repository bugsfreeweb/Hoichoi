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
  title: `${BRAND.bn} — অটো-কিউরেটেড সংবাদ ডেস্ক`,
  description: `${BRAND.tagline}. ${BRAND.pipeline}.`,
  icons: { icon: "/favicon.svg" },
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

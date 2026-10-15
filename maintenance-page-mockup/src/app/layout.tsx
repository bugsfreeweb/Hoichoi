import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "হৈচৈ · রক্ষণাবেক্ষণ চলছে — শীঘ্রই ফিরছি",
  description:
    "হৈচৈ নিউজরুম এখন পাইপলাইন যাচাই করছে: FEED → SHOT → HASH → LLM → GIT → DEPLOY। প্রথম পাতা লাইভ হওয়ামাত্র জানতে ইমেইল রেখে যান।",
  openGraph: {
    title: "হৈচৈ। — শহরের হৈচৈ, সংবাদের ভাষায়",
    description: "ডেটা যাচাই চলছে। সংগৃহীত · প্রকাশিত · ফ্যাক্ট-গেট পার হওয়া।",
    locale: "bn_BD",
    siteName: "হৈচৈ।",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-[#f3eee1] text-[#1a140d] antialiased font-sans-bn">{children}</body>
    </html>
  );
}

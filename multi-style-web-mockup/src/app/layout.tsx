import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import NotificationHUD from "@/components/ui/NotificationHUD";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "হৈচৈ · শহরের হৈচৈ, সংবাদের ভাষায়",
    template: "%s · হৈচৈ",
  },
  description:
    "হৈচৈ নিউজরুম — ফিড থেকে সংগ্রহ, হ্যাশ-ডুপ্লিকেট গেট, ফ্যাক্ট-গেট পুনর্লিখন আর লাইভ ডেটা ইনসাইট এক জায়গায়।",
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn" data-theme="dark" data-motion="on" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('hoichoi-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch(e){}})();",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Tiro+Bangla:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="relative min-h-screen bg-ink-950 text-mist-200 antialiased">
        {/* ambient layered backdrop */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 grid-bg opacity-[0.55]" />
          <div
            className="absolute -top-40 left-1/2 h-[620px] w-[1100px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[130px]"
            style={{
              background:
                "radial-gradient(closest-side, var(--accent), rgba(245,165,36,0.45) 45%, transparent 75%)",
            }}
          />
          <div
            className="absolute bottom-[-18rem] left-[-10rem] h-[520px] w-[520px] rounded-full opacity-[0.12] blur-[120px]"
            style={{ background: "radial-gradient(closest-side,#22a7e6,transparent 72%)" }}
          />
          <div
            className="absolute right-[-12rem] top-1/3 h-[460px] w-[460px] rounded-full opacity-[0.1] blur-[120px]"
            style={{ background: "radial-gradient(closest-side,#a78bfa,transparent 72%)" }}
          />
        </div>
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 noise-overlay" />
        <div className="relative z-10">{children}</div>
        <NotificationHUD />
      </body>
    </html>
  );
}

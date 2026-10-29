import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/noto-serif-bengali";
import "@fontsource-variable/noto-sans-bengali";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "হৈচৈ · হৈচৈ।",
  description:
    "ভাইরাল বাংলা, সপ্তাহখানেক. ফেসবুকের হৈচৈ — এখন বাংলায়, সাত দিন পর গায়েব",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn" dir="ltr" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f5f3ee" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('hoichoi-theme');if(t==='dark'||t==='obsidian'||t==='light'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t==='light'?'light':'dark';var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#f5f3ee':t==='dark'?'#111720':'#090b0f'}}catch(e){}`,
          }}
        />
      </head>
      <body className="grain" style={{ fontFamily: "var(--font-sans-bn-loaded), system-ui, sans-serif" }}>
        <style>{`
          :root{
            --font-serif-bn: 'Noto Serif Bengali Variable', 'Noto Serif Bengali', Georgia, serif;
            --font-sans-bn-loaded: 'Noto Sans Bengali Variable', 'Noto Sans Bengali', system-ui, sans-serif;
            --font-mono-loaded: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
            --font-mono-x: var(--font-mono-loaded);
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}

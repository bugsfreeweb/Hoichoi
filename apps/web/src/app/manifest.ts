import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "হৈচৈ। — ভাইরাল বাংলা, সপ্তাহখানেক",
    short_name: "হৈচৈ।",
    description: "Auto-curated Bangla news desk — Facebook ভাইরাল কনটেন্ট, সাত দিনের জানালা।",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee1",
    theme_color: "#0a0c10",
    lang: "bn",
    dir: "ltr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
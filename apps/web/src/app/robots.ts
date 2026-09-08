import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL ?? "https://hoichoi.local";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/media/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
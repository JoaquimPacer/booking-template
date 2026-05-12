// robots.txt. Allows indexing on production deploys, blocks indexing
// on Vercel preview deploys (Vercel also sets X-Robots-Tag: noindex
// on previews automatically, but this is belt-and-suspenders).

import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === "production";

  return {
    rules: [
      {
        userAgent: "*",
        allow: isProduction ? "/" : undefined,
        disallow: isProduction ? ["/api/", "/studio/"] : "/",
      },
    ],
    sitemap: isProduction ? `${getSiteUrl()}/sitemap.xml` : undefined,
  };
}

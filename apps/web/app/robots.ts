import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/trades/",
        "/cycles/",
        "/settings/",
        "/reports/",
        "/orders/",
        "/api/",
        "/login",
        "/register",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

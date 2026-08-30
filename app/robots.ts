import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/gestion-ssjblue", "/gestion-ssjblue/", "/api/", "/feed/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/kitchen", "/t/", "/api/", "/account", "/login", "/order/", "/auth/"] },
    sitemap: abs("/sitemap.xml"),
  };
}

import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/menu", "/offers", "/gallery", "/about", "/blog", "/contact", "/privacy"].map((p) => ({
    url: abs(p),
    changeFrequency: p === "/menu" || p === "/offers" ? "daily" : "weekly",
    priority: p === "/" ? 1 : p === "/menu" ? 0.9 : 0.6,
  }));
}

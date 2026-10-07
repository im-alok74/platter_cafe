import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Platter Cafe & Restro",
    short_name: "Platter",
    description: "Order from your table, take it away, or get it delivered. Jhalana, Jaipur.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ef",
    theme_color: "#2a1d17",
    lang: "en-IN",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

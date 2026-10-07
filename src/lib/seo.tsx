import type { Metadata } from "next";
import { env } from "@/env";
import type { SiteSettings } from "@/lib/data/site";

export const SITE_NAME = "Platter Cafe & Restro";
const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Platter Cafe & Restro, Jhalana, Jaipur" };
export const abs = (path: string) => new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();

/** Renders a schema.org JSON-LD script. Data is our own, serialised with `<` escaped. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Title, description, canonical, Open Graph and Twitter tags in one place so no page forgets one. */
export function pageMeta({ title, description, path, absoluteTitle = false }: { title: string; description: string; path: string; absoluteTitle?: boolean }): Metadata {
  const full = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", title: full, description, url: path, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: full, description, images: ["/twitter-image"] },
  };
}

export function breadcrumbLd(trail: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"], ...trail].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

export function websiteLd() {
  return { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: abs("/"), inLanguage: "en-IN" };
}

export function restaurantLd(s: SiteSettings, image?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": abs("/#restaurant"),
    name: SITE_NAME,
    description: "Cafe and restaurant at Rajasthan International Centre, Jhalana, Jaipur. Coffee, breakfast, pizza, pasta, Indian mains and desserts. Dine in, takeaway and delivery.",
    url: abs("/"),
    image,
    logo: abs("/icon/512"),
    telephone: s.contact.phone,
    email: s.contact.email,
    servesCuisine: ["Cafe", "Indian", "Italian", "Chinese"],
    priceRange: "₹₹",
    hasMenu: abs("/menu"),
    sameAs: [s.contact.instagram],
    hasMap: s.contact.maps_url,
    geo: { "@type": "GeoCoordinates", latitude: s.delivery.lat, longitude: s.delivery.lng },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Platter 9 (Lower Ground Floor), Rajasthan International Centre, Sansthan Path, JLN Marg, Jhalana Doongri",
      addressLocality: "Jaipur",
      addressRegion: "Rajasthan",
      postalCode: "302017",
      addressCountry: "IN",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: s.hours.open,
      closes: s.hours.close,
    },
    potentialAction: {
      "@type": "OrderAction",
      target: { "@type": "EntryPoint", urlTemplate: abs("/menu"), actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] },
      deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModePickUp", ...(s.flags.delivery ? ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"] : [])],
    },
  };
}

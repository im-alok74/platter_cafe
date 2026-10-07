import type { Metadata, Viewport } from "next";
import { Allura, Fraunces, Inter } from "next/font/google";
import { env } from "@/env";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const allura = Allura({ variable: "--font-allura", subsets: ["latin"], weight: "400", display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: "Platter Cafe & Restro, Jaipur", template: "%s | Platter Cafe & Restro" },
  description: "Cafe and restaurant at Rajasthan International Centre, JLN Marg, Jaipur. Order from your table.",
  applicationName: "Platter",
  category: "restaurant",
  keywords: ["cafe in Jaipur", "restaurant Jhalana", "Platter Cafe", "coffee Jaipur", "Rajasthan International Centre cafe", "food delivery Jhalana"],
  openGraph: { type: "website", siteName: "Platter Cafe & Restro", locale: "en_IN", url: "/", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Platter Cafe & Restro, Jhalana, Jaipur" }] },
  twitter: { card: "summary_large_image", images: ["/twitter-image"] },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the token Google Search Console gives you.
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  other: { "geo.region": "IN-RJ", "geo.placename": "Jaipur" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1816" },
  ],
};

// Applies the saved theme before first paint so the page never flashes the wrong colours.
const THEME_SCRIPT = `try{var t=localStorage.getItem("platter.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable} ${allura.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

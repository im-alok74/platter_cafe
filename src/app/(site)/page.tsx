import { Suspense } from "react";
import { getGallery, getSettings, templateOf } from "@/lib/data/site";
import { JsonLd, pageMeta, restaurantLd, websiteLd } from "@/lib/seo";
import { HomeExpressive } from "./home-expressive";
import { HomeMinimal } from "./home-minimal";

export const metadata = pageMeta({
  title: "Platter Cafe & Restro, Jaipur | Coffee, Food & Table Ordering",
  absoluteTitle: true,
  description: "Platter at Rajasthan International Centre, JLN Marg, Jaipur. Coffee, breakfast, pizza, pasta, Indian mains and desserts. Dine in, takeaway or delivery. Open every day 11 AM to 10:30 PM.",
  path: "/",
});

async function Schema() {
  const [s, g] = await Promise.all([getSettings(), getGallery()]);
  return (
    <>
      <JsonLd data={restaurantLd(s, g[0]?.url)} />
      <JsonLd data={websiteLd()} />
    </>
  );
}

/** Picks the look the owner chose in Admin > Design. */
async function Look() {
  return templateOf(await getSettings()) === "expressive" ? <HomeExpressive /> : <HomeMinimal />;
}

export default function Home() {
  return (
    <>
      <Suspense fallback={<div className="min-h-[90svh]" />}>
        <Look />
      </Suspense>
      <Suspense>
        <Schema />
      </Suspense>
    </>
  );
}

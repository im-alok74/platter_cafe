import { Suspense } from "react";
import { getMenu } from "@/lib/data/menu";
import { JsonLd, abs, breadcrumbLd, pageMeta } from "@/lib/seo";
import { PublicMenu } from "./public-menu";

export const metadata = pageMeta({
  title: "Menu: coffee, breakfast, pizza, pasta and more",
  description: "The full Platter menu with prices: coffee, tea, breakfast, pizzas, pastas, Indian mains, Chinese, salads and desserts. Order online for dine in, takeaway or delivery in Jaipur.",
  path: "/menu",
});

function Skeleton() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-4 py-6 md:grid-cols-3" aria-busy="true" aria-label="Loading menu">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-56 animate-pulse rounded-[var(--radius-card)] bg-border" />
      ))}
    </div>
  );
}

async function Menu() {
  const categories = await getMenu();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "Platter menu",
    url: abs("/menu"),
    hasMenuSection: categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name,
      hasMenuItem: c.items.map((i) => ({
        "@type": "MenuItem",
        name: i.name,
        offers: { "@type": "Offer", price: i.price, priceCurrency: "INR" },
        suitableForDiet: i.is_veg ? "https://schema.org/VegetarianDiet" : undefined,
      })),
    })),
  };
  return (
    <>
      <PublicMenu categories={categories} summary="Prices in rupees, taxes as applicable" />
      <JsonLd data={ld} />
    </>
  );
}

export default function MenuPage() {
  return (
    <main>
      <JsonLd data={breadcrumbLd([["Menu", "/menu"]])} />
      <h1 className="sr-only">Platter menu</h1>
      <Suspense fallback={<Skeleton />}>
        <Menu />
      </Suspense>
    </main>
  );
}

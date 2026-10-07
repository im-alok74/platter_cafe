import { breadcrumbLd, JsonLd, pageMeta } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Suspense } from "react";
import { getSettings } from "@/lib/data/site";

export const metadata = pageMeta({
  title: "About Platter, a cafe in Jhalana, Jaipur",
  description: "Platter is a unit of Kehwa: a cafe and restaurant on the lower ground floor of Rajasthan International Centre, Jaipur. Coffee, food, games corner and catering on request.",
  path: "/about",
});

// ponytail: copy limited to facts from the printed menu and cafe photos. Editable About text arrives in Phase 8.
async function Body() {
  const { legal, contact } = await getSettings();
  return (
    <div className="space-y-4 leading-relaxed text-muted">
      <p className="display text-2xl leading-snug text-foreground">
        Platter is a cafe and restaurant on the lower ground floor of Rajasthan International Centre, Jhalana, Jaipur. {legal.tagline}.
      </p>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        {[["Every day", "11 AM – 10:30 PM"], ["Catering", "On request"], ["Games", "Carrom, foosball"]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-surface p-3">
            <dt className="font-semibold text-foreground">{k}</dt>
            <dd className="mt-1 text-xs text-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <p>
        We serve coffee and tea, breakfast, pizzas, pastas, Indian mains, Chinese, salads and desserts, and you can order straight from your table by scanning the QR code on it.
      </p>
      <p>
        Come for a long coffee. The room has a wall of posters, plenty of plants, and a corner with carrom and foosball.
      </p>
      <p>
        Choice of cuisines, customised to your need. Catering is our other speciality: call {contact.phone.replace("+91", "+91 ")} or write to {contact.email}.
      </p>
      <p><Link href="/menu" className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground">See the menu</Link></p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main>
      <JsonLd data={breadcrumbLd([["About us", "/about"]])} />
      <PageHeader narrow eyebrow="Our story" title="About Platter" />
      <div className="mx-auto max-w-2xl px-4 py-8">
      <Suspense fallback={<div className="mt-4 h-40 animate-pulse rounded bg-border" />}>
        <Body />
      </Suspense>
      </div>
    </main>
  );
}

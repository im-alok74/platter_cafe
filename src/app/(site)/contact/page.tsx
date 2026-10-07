import { breadcrumbLd, JsonLd, pageMeta } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { Suspense } from "react";
import { OpenBadge } from "@/components/open-badge";
import { getSettings } from "@/lib/data/site";
import { telHref, waHref } from "@/lib/format";
import { formatTime } from "@/lib/hours";

export const metadata = pageMeta({
  title: "Contact and directions, Jhalana Jaipur",
  description: "Call, WhatsApp or get directions to Platter, Rajasthan International Centre, JLN Marg, Jhalana, Jaipur. Open every day 11 AM to 10:30 PM.",
  path: "/contact",
});

const btn = "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition active:scale-95";

async function Details() {
  const s = await getSettings();
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <a href={telHref(s.contact.phone)} className={`${btn} bg-brand text-brand-foreground`}>Call</a>
        <a href={waHref(s.contact.whatsapp)} target="_blank" rel="noopener noreferrer" className={`${btn} border border-border bg-surface`}>WhatsApp</a>
        <a href={s.contact.maps_url} target="_blank" rel="noopener noreferrer" className={`${btn} border border-border bg-surface`}>Directions</a>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Open every day</p>
          <p className="display mt-2 text-2xl">{formatTime(s.hours.open)} – {formatTime(s.hours.close)}</p>
          <p className="mt-1 text-sm text-muted">No weekly off.</p>
          <OpenBadge hours={s.hours} className="mt-3" />
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <address className="leading-relaxed not-italic">{s.contact.address}</address>
          <ul className="mt-3 space-y-1 text-sm font-medium">
            <li><a className="inline-flex min-h-11 items-center text-brand" href={`mailto:${s.contact.email}`}>{s.contact.email}</a></li>
            <li><a className="inline-flex min-h-11 items-center text-brand" href={s.contact.instagram} target="_blank" rel="noopener noreferrer">Instagram: @platter_cafe</a></li>
          </ul>
        </section>
      </div>
      <section className="mt-4 rounded-[var(--radius-card)] bg-espresso p-5 text-[#fbf6ef]">
        <p className="display text-2xl">Planning an event?</p>
        <p className="mt-1 text-sm text-[#d9cbbd]">Catering is our other speciality. Call or message us.</p>
      </section>
      <iframe title="Platter on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="mt-6 h-72 w-full rounded-[var(--radius-card)] border border-border" src={`https://www.google.com/maps?q=${encodeURIComponent("Rajasthan International Centre, JLN Marg, Jaipur")}&output=embed`} />
    </>
  );
}

export default function ContactPage() {
  return (
    <main>
      <JsonLd data={breadcrumbLd([["Contact", "/contact"]])} />
      <PageHeader narrow eyebrow="Find us" title="Contact" />
      <div className="mx-auto max-w-2xl px-4 py-8">
      <Suspense fallback={<div className="mt-4 h-64 animate-pulse rounded bg-border" />}>
        <Details />
      </Suspense>
      </div>
    </main>
  );
}

import { breadcrumbLd, JsonLd, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ArrowIcon, PhoneIcon, QrIcon } from "@/components/icons";
import { getOffers, getSettings } from "@/lib/data/site";
import { formatPrice, telHref } from "@/lib/format";

export const metadata = pageMeta({
  title: "Offers and deals at Platter, Jaipur",
  description: "Current offers, deals and seasonal specials at Platter cafe, Jhalana, Jaipur, plus how to get catering and group menus.",
  path: "/offers",
});

const card = "tilt rounded-3xl border border-border bg-surface p-6 shadow-card";

async function List() {
  const offers = await getOffers();
  if (!offers.length)
    return (
      <div className={`${card} text-center`}>
        <p className="display text-2xl">No offers running right now</p>
        <p className="mx-auto mt-2 max-w-md text-muted">New deals appear here the moment they start. Follow us on Instagram or ask the team at the counter to hear first.</p>
        <Link href="/menu" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground">See the menu</Link>
      </div>
    );
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {offers.map((o) => (
        <li key={o.id} className={card}>
          <span className="inline-block rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">Offer</span>
          <p className="display mt-3 text-2xl">{o.name}</p>
          {o.config.description && <p className="mt-2 text-sm leading-relaxed text-muted">{o.config.description}</p>}
          {o.min_order > 0 && <p className="mt-3 text-xs font-medium text-muted">On orders above {formatPrice(o.min_order)}</p>}
        </li>
      ))}
    </ul>
  );
}

async function MoreWays() {
  const s = await getSettings();
  const ways = [
    { Icon: QrIcon, title: "Ask at your table", text: "Staff know about every running deal. Mention it when you order, or ask what is on today." },
    { Icon: PhoneIcon, title: "Groups & parties", text: "Booking for a crowd? Call us for catering and group menus, customised to your need.", href: telHref(s.contact.phone), cta: `Call ${s.contact.phone.replace("+91", "+91 ")}` },
    { Icon: ArrowIcon, title: "Follow for first dibs", text: "Seasonal specials and new dishes are announced on Instagram first.", href: s.contact.instagram, cta: "@platter_cafe", external: true },
  ];
  return (
    <section className="mt-12">
      <h2 className="display text-3xl">More ways to save and celebrate</h2>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {ways.map(({ Icon, title, text, href, cta, external }) => (
          <li key={title} className={card}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon width={22} height={22} /></span>
            <p className="mt-3 text-lg font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            {href && cta && (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand">{cta}</a>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-3xl bg-espresso p-6 text-white md:flex-row md:items-center">
        <div>
          <p className="display text-2xl">Rewards for regulars are on the way</p>
          <p className="mt-1 text-sm text-white/70">Points on every order and a referral bonus are being added. Sign in with your phone number so your orders count from today.</p>
        </div>
        <Link href="/login?next=/account" className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground">Sign in</Link>
      </div>
    </section>
  );
}

export default function OffersPage() {
  return (
    <main>
      <JsonLd data={breadcrumbLd([["Offers", "/offers"]])} />
      <PageHeader eyebrow="Deals" title="Offers">Running deals and seasonal specials at Platter.</PageHeader>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Suspense fallback={<div className="h-32 animate-pulse rounded-3xl bg-border" />}>
          <List />
          <MoreWays />
        </Suspense>
      </div>
    </main>
  );
}

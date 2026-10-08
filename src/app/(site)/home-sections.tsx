import Image from "next/image";
import Link from "next/link";
import { CoffeeHero } from "@/components/fx/fx";
import { HomePicks } from "@/components/home-picks";
import { ArrowIcon, BagIcon, ClockIcon, PhoneIcon, PinIcon, QrIcon, ScooterIcon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { OpenBadge } from "@/components/open-badge";
import { getMenu } from "@/lib/data/menu";
import { getGallery, getOffers, getSettings } from "@/lib/data/site";
import { formatPrice, telHref, waHref } from "@/lib/format";
import { formatTime } from "@/lib/hours";

export const wrap = "mx-auto w-full max-w-6xl px-4";
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.2em] text-gold-text";
export const h2 = "display mt-2 text-4xl md:text-5xl";
export const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-base font-semibold text-brand-foreground shadow-card transition hover:brightness-110 active:scale-95";
export const ghost = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-foreground/25 px-7 text-base font-semibold transition hover:bg-foreground/5 active:scale-95";
export const tints = ["bg-sand", "bg-brand/10", "bg-gold/20", "bg-info/10"];

export function Announcement({ open, close }: { open: string; close: string }) {
  return (
    <p className="bg-espresso px-4 py-2 text-center text-xs font-medium tracking-wide text-gold">
      Open every day, {formatTime(open)} to {formatTime(close)} · Dine in · Takeaway · Delivery
    </p>
  );
}

export async function Hero() {
  const [s, gallery, menu] = await Promise.all([getSettings(), getGallery(), getMenu()]);
  const dishes = menu.reduce((n, c) => n + c.items.length, 0);
  const room = gallery[1] ?? gallery[0];
  return (
    <>
      <Announcement open={s.hours.open} close={s.hours.close} />
      <section className={`${wrap} grid items-center gap-10 pb-12 pt-10 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14`}>
        <div>
          <p className={eyebrow}>Jhalana, Jaipur · Cafe &amp; Restro</p>
          <h1 className="display mt-4 text-[2.9rem] leading-[1.02] sm:text-6xl lg:text-7xl">
            Good coffee, good food &amp; a table that&apos;s <em className="text-brand">waiting.</em>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted md:text-lg">
            Coffee, breakfast, pizza, pasta and Indian mains. Scan the QR on your table, take it away, or get it delivered across Jaipur.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/menu" className={primary}>Order now <ArrowIcon width={20} height={20} /></Link>
            <Link href="/menu" className={ghost}>View menu</Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-muted">
            <OpenBadge hours={s.hours} />
            <span className="inline-flex items-center gap-1.5"><PinIcon width={18} height={18} className="text-brand" /> Rajasthan International Centre</span>
          </div>
        </div>

        <div className="grid grid-cols-[1.15fr_1fr] gap-3">
          <CoffeeHero className="row-span-2 aspect-[3/4] rounded-[28px] bg-sand" />
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-sand">
            {room && <Image src={room.url} alt="Inside Platter" fill sizes="(min-width: 1024px) 24vw, 40vw" placeholder="blur" blurDataURL={room.blur} className="object-cover" />}
          </div>
          <div className="flex flex-col justify-center rounded-[28px] bg-espresso p-5 text-white">
            <p className="display text-5xl text-gold">{dishes}</p>
            <p className="mt-1 text-sm text-white/75">dishes on the menu, all marked veg or non-veg</p>
          </div>
        </div>
      </section>
    </>
  );
}

export function Ticker() {
  const words = ["Coffee", "Breakfast", "Pizza", "Pasta", "Indian mains", "Chinese", "Desserts", "Cold brew", "Shakes", "Catering"];
  const row = [...words, ...words];
  return (
    <div className="overflow-hidden bg-brand py-3 text-brand-foreground" aria-hidden>
      <div className="marquee flex w-max gap-8 whitespace-nowrap font-display text-xl">
        {row.concat(row).map((w, i) => (
          <span key={i} className="flex items-center gap-8">{w} <span className="text-sm opacity-70">✦</span></span>
        ))}
      </div>
    </div>
  );
}

export async function Categories() {
  const menu = await getMenu();
  return (
    <section className={`${wrap} pt-16`}>
      <Reveal>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>The menu</p>
            <h2 className={h2}>What are you craving?</h2>
          </div>
          <Link href="/menu" className="hidden min-h-11 items-center gap-1 text-sm font-semibold text-brand md:inline-flex">Full menu <ArrowIcon width={18} height={18} /></Link>
        </div>
      </Reveal>
      <ul className="-mx-4 mt-8 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-6">
        {menu.map((c, i) => (
          <li key={c.id} className="w-36 shrink-0 snap-start md:w-auto">
            <Link href={`/menu#${c.slug}`} className={`group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl p-4 transition hover:-translate-y-1 hover:shadow-card ${tints[i % tints.length]}`}>
              {c.image ? (
                <>
                  <Image src={c.image.url} alt="" fill sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 144px" className="object-cover transition duration-500 group-hover:scale-105" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                </>
              ) : (
                <span aria-hidden className="display absolute left-4 top-3 text-6xl text-foreground/20 transition group-hover:text-brand/50">{c.name.charAt(0)}</span>
              )}
              <span className={`relative ${c.image ? "text-white" : ""}`}>
                <span className="block font-semibold leading-tight">{c.name}</span>
                <span className={`text-xs ${c.image ? "text-white/80" : "text-muted"}`}>{c.items.length} items</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function Picks() {
  const menu = await getMenu();
  const flagged = menu.flatMap((c) => c.items).filter((i) => (i.is_special || i.badges.includes("Bestseller")) && !i.sold_out);
  // Until the owner flags favourites, show one dish from the first categories as a neutral taste of the menu.
  const taste = menu.filter((c) => c.slug !== "favourites").map((c) => c.items.find((i) => !i.sold_out)).filter((i) => i !== undefined).slice(0, 8);
  const picks = (flagged.length >= 4 ? flagged : taste).slice(0, 8);
  if (!picks.length) return null;
  return (
    <section className="mt-16 bg-sand py-14">
      <div className={wrap}>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{flagged.length >= 4 ? "Fresh from the kitchen" : "Start here"}</p>
          <h2 className={h2}>{flagged.length >= 4 ? "Today's picks" : "A taste of the menu"}</h2>
        </Reveal>
        <div className="mt-8"><HomePicks items={picks} /></div>
        <Link href="/menu" className={`${primary} mt-4`}>See the full menu <ArrowIcon width={20} height={20} /></Link>
      </div>
    </section>
  );
}

export async function OrderWays() {
  const s = await getSettings();
  const ways = [
    { Icon: QrIcon, title: "Dine in", text: "Scan the QR code on your table. Add your name and number and your order goes straight to the kitchen." },
    { Icon: BagIcon, title: "Takeaway", text: "Order ahead from your phone and pick it up when it is ready. No queue at the counter." },
    ...(s.flags.delivery ? [{ Icon: ScooterIcon, title: "Delivery", text: `Brought to your door. ${formatPrice(s.delivery.base_fare)} for the first ${s.delivery.base_km} km, then ${formatPrice(s.delivery.per_km)} per km, like a ride app.` }] : []),
  ];
  return (
    <section className={`${wrap} pt-16`}>
      <Reveal>
        <p className={eyebrow}>Order your way</p>
        <h2 className={h2}>However you like it</h2>
      </Reveal>
      <ul className={`mt-8 grid gap-4 ${ways.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {ways.map(({ Icon, title, text }, i) => (
          <li key={title}>
            <Reveal delay={i * 0.07} className="h-full">
              <Link href="/menu" className="group flex h-full flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand"><Icon /></span>
                <span className="text-xl font-semibold">{title}</span>
                <span className="text-sm leading-relaxed text-muted">{text}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand">Start an order <ArrowIcon width={16} height={16} className="transition group-hover:translate-x-1" /></span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ["Scan", "Scan the QR code on your table. The menu opens with your table already attached."],
    ["Choose", "Pick your dishes, add a note if you like, and enter just your name and phone number."],
    ["Enjoy", "Watch your order move from received to ready, live. Pay at the counter when you are done."],
  ];
  return (
    <section className="mt-16 bg-espresso py-16 text-white">
      <div className={`${wrap} grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center`}>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Table ordering</p>
          <h2 className="display mt-2 text-4xl md:text-5xl">From scan to served in three steps</h2>
          <p className="mt-4 max-w-md text-white/70">No app to install and no account needed. Sign in only if you want your past orders and favourites in one place.</p>
        </Reveal>
        <ol className="space-y-4">
          {steps.map(([t, d], i) => (
            <li key={t}>
              <Reveal delay={i * 0.08}>
                <div className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">{i + 1}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{t}</h3>
                    <p className="mt-1 leading-relaxed text-white/75">{d}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export async function Album() {
  const gallery = await getGallery();
  if (gallery.length < 4) return null;
  const shown = gallery.filter((_, i) => i !== 3 && i !== 5).slice(0, 6); // skip the two ceiling shots
  return (
    <section className={`${wrap} pt-16`}>
      <Reveal>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>Inside Platter</p>
            <h2 className={h2}>Come sit with us</h2>
            <p className="mt-3 max-w-lg text-muted">Marble tables, soft sofas, a wall of posters and a corner for carrom and foosball. Plenty of plants, too.</p>
          </div>
          <Link href="/gallery" className="hidden min-h-11 items-center gap-1 text-sm font-semibold text-brand md:inline-flex">See all photos <ArrowIcon width={18} height={18} /></Link>
        </div>
      </Reveal>
      <div className="mt-8 columns-2 gap-3 md:columns-3 [&>*]:mb-3">
        {shown.map((g, i) => (
          <Reveal key={g.id} delay={(i % 3) * 0.06}>
            <Image src={g.url} alt="Inside Platter cafe" width={g.width} height={g.height} sizes="(min-width: 768px) 33vw, 50vw" placeholder="blur" blurDataURL={g.blur} className={`w-full rounded-3xl object-cover ${i % 3 === 1 ? "aspect-[4/5]" : "aspect-[3/4]"}`} />
          </Reveal>
        ))}
      </div>
      <Link href="/gallery" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand md:hidden">See all photos <ArrowIcon width={18} height={18} /></Link>
    </section>
  );
}

export async function Catering() {
  const s = await getSettings();
  return (
    <section className={`${wrap} pt-16`}>
      <Reveal>
        <div className="grid gap-6 rounded-[32px] bg-brand p-8 text-brand-foreground md:grid-cols-[1.4fr_1fr] md:items-center md:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">Events &amp; parties</p>
            <h2 className="display mt-2 text-4xl md:text-5xl">Planning a party? We cater.</h2>
            <p className="mt-3 max-w-lg opacity-90">Catering is our other speciality. Choice of cuisines, customised to your need. Tell us the date and the number of guests and we will take it from there.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a href={telHref(s.contact.phone)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-brand transition active:scale-95"><PhoneIcon width={20} height={20} /> Call us</a>
            <a href={waHref(s.contact.whatsapp, "Hi Platter, I would like to ask about catering. ")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-current px-7 text-base font-semibold transition active:scale-95">WhatsApp</a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export async function OffersTeaser() {
  const [offers, s] = await Promise.all([getOffers(), getSettings()]);
  return (
    <section className={`${wrap} pt-16`}>
      <Reveal>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>Offers</p>
            <h2 className={h2}>Deals &amp; seasonal specials</h2>
          </div>
          <Link href="/offers" className="hidden min-h-11 items-center gap-1 text-sm font-semibold text-brand md:inline-flex">All offers <ArrowIcon width={18} height={18} /></Link>
        </div>
      </Reveal>
      {offers.length > 0 ? (
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {offers.slice(0, 3).map((o) => (
            <li key={o.id} className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">Offer</span>
              <p className="display mt-3 text-2xl">{o.name}</p>
              {o.config.description && <p className="mt-2 text-sm text-muted">{o.config.description}</p>}
              {o.min_order > 0 && <p className="mt-2 text-xs text-muted">On orders above {formatPrice(o.min_order)}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-dashed border-border bg-surface p-6 md:flex-row md:items-center">
          <div>
            <p className="display text-2xl">New offers land here first.</p>
            <p className="mt-1 text-muted">Follow us on Instagram for the latest, or ask the team at the counter.</p>
          </div>
          <a href={s.contact.instagram} target="_blank" rel="noopener noreferrer" className={ghost}>@platter_cafe</a>
        </div>
      )}
    </section>
  );
}

export async function Faq() {
  const s = await getSettings();
  const items: [string, string][] = [
    ["What time are you open?", `Every day, ${formatTime(s.hours.open)} to ${formatTime(s.hours.close)}. There is no weekly off.`],
    ["Do I need to download an app?", "No. Scan the QR code on your table, or open this website on your phone, pick your dishes and place the order. You only need your name and phone number."],
    ["How do I pay?", "For dine in and takeaway, pay at the counter. For delivery, pay the delivery person in cash or UPI when your order arrives."],
    ...(s.flags.delivery ? [["How is delivery priced?", `By road distance from the cafe, like a ride app: ${formatPrice(s.delivery.base_fare)} for the first ${s.delivery.base_km} km, then ${formatPrice(s.delivery.per_km)} per km, up to ${s.delivery.max_km} km. You see the exact fee before you place the order.`] as [string, string]] : []),
    ["Can I get breakfast delivered?", "Breakfast is on the menu all day for dine in and takeaway, but it is not part of delivery. The cart tells you if something in it cannot be delivered."],
    ["Which dishes are vegetarian?", "Every dish carries a green (vegetarian) or red (non-vegetarian) mark, and you can switch on the Veg filter on the menu."],
    ["Do you do catering?", `Yes. Call ${s.contact.phone.replace("+91", "+91 ")} or write to ${s.contact.email} with the date and number of guests.`],
  ];
  return (
    <section className={`${wrap} grid gap-8 pt-16 lg:grid-cols-[1fr_1.6fr]`}>
      <Reveal>
        <p className={eyebrow}>Good to know</p>
        <h2 className={h2}>Quick answers</h2>
        <p className="mt-3 text-muted">Anything else? Call us or WhatsApp. We reply fast.</p>
      </Reveal>
      <div className="space-y-3">
        {items.map(([q, a]) => (
          <details key={q} className="group rounded-2xl border border-border bg-surface px-5 shadow-card open:border-brand">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
              {q}
              <span aria-hidden className="text-2xl leading-none text-brand transition group-open:rotate-45">+</span>
            </summary>
            <p className="pb-5 leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export async function Visit() {
  const s = await getSettings();
  const row = "flex items-start gap-3";
  return (
    <section className={`${wrap} pt-16`}>
      <Reveal>
        <p className={eyebrow}>Find us</p>
        <h2 className={h2}>Come say hello</h2>
      </Reveal>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Reveal>
          <div className="h-full space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-card">
            <p className={row}><PinIcon className="mt-0.5 shrink-0 text-brand" /><span className="leading-relaxed">{s.contact.address}</span></p>
            <p className={row}><ClockIcon className="mt-0.5 shrink-0 text-brand" /><span>Every day, {formatTime(s.hours.open)} to {formatTime(s.hours.close)}. No weekly off.</span></p>
            <p className={row}><PhoneIcon className="mt-0.5 shrink-0 text-brand" /><a className="inline-flex min-h-11 items-center font-medium text-brand" href={telHref(s.contact.phone)}>{s.contact.phone.replace("+91", "+91 ")}</a></p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href={s.contact.maps_url} target="_blank" rel="noopener noreferrer" className={primary}>Get directions</a>
              <Link href="/contact" className={ghost}>Contact</Link>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <iframe title="Platter on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-72 w-full rounded-3xl border border-border md:h-full md:min-h-72" src={`https://www.google.com/maps?q=${encodeURIComponent("Rajasthan International Centre, JLN Marg, Jaipur")}&output=embed`} />
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className={`${wrap} pt-16`}>
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-6 rounded-[32px] bg-espresso p-8 text-white md:flex-row md:items-center md:p-12">
          <h2 className="display max-w-md text-4xl md:text-5xl">Hungry? Your table is <span className="text-gold">waiting.</span></h2>
          <Link href="/menu" className={primary}>See the menu <ArrowIcon width={20} height={20} /></Link>
        </div>
      </Reveal>
    </section>
  );
}

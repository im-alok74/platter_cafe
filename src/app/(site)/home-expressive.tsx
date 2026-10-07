import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Beans, Cup, SpinBadge, SplitText, Wave } from "@/components/fx/fx";
import { CountUp, Magnetic } from "@/components/fx/fx-client";
import { ArrowIcon, BagIcon, QrIcon, ScooterIcon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { OpenBadge } from "@/components/open-badge";
import { getMenu } from "@/lib/data/menu";
import { getGallery, getHero, getSettings } from "@/lib/data/site";
import { formatPrice } from "@/lib/format";
import { Announcement, Catering, Faq, OffersTeaser, Picks, Visit, primary, wrap } from "./home-sections";

const ghostLight = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#fbf6ef]/60 px-7 text-base font-semibold text-[#fbf6ef] transition hover:bg-[#fbf6ef]/10 active:scale-95";
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

async function HeroX() {
  const [s, hero] = await Promise.all([getSettings(), getHero()]);
  return (
    <>
      <Announcement open={s.hours.open} close={s.hours.close} />
      <section className="relative isolate overflow-hidden bg-espresso text-[#fbf6ef]">
        <Beans count={6} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-screen" style={{ backgroundImage: GRAIN }} />
        <div className={`${wrap} relative grid min-h-[calc(100svh-6rem)] items-center gap-10 py-14 md:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.35fr_1fr]`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Jhalana · Jaipur · Cafe &amp; Restro</p>
            <h1 className="display mt-4 text-[clamp(4.2rem,15vw,9rem)] leading-[0.98] tracking-tight sm:leading-[0.85]">
              <span className="block"><SplitText text="Sip." /></span>
              <span className="stroke-text stroke-light block italic"><SplitText text="Bite." delay={260} /></span>
              <span className="block text-gold"><SplitText text="Stay." delay={520} /></span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#d9cbbd] md:text-lg">
              Good coffee, good food and a table that&apos;s waiting. Scan, order, and watch it arrive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic><Link href="/menu" className={primary}>Order now <ArrowIcon width={20} height={20} /></Link></Magnetic>
              <Magnetic><Link href="/menu" className={ghostLight}>View menu</Link></Magnetic>
            </div>
            <div className="mt-7"><OpenBadge hours={s.hours} /></div>
          </div>
          <div className="relative mx-auto w-full max-w-[24rem]">
            {hero ? (
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-[999px] rounded-b-[2.5rem] border-4 border-gold/50 bg-sand shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
                <Image src={hero.url} alt={hero.alt} fill priority sizes="(min-width: 768px) 24rem, 80vw" placeholder="blur" blurDataURL={hero.blur} className="object-cover" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              </div>
            ) : (
              <Cup className="mx-auto aspect-[6/5] w-full max-w-[26rem]" />
            )}
            <SpinBadge id="badge-hero" text={s.flags.delivery ? "OPEN DAILY • DINE IN • TAKEAWAY • DELIVERY • " : "OPEN DAILY • DINE IN • TAKEAWAY • OPEN DAILY • "} className="absolute -bottom-6 -left-4 h-28 w-28 rounded-full bg-espresso text-gold shadow-xl md:-left-8 md:h-32 md:w-32">
              <Link href="/menu" aria-label="See the menu" className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-foreground transition hover:scale-110 md:h-14 md:w-14"><ArrowIcon width={22} height={22} /></Link>
            </SpinBadge>
          </div>
        </div>
      </section>
    </>
  );
}

function TickerX() {
  const words = ["Coffee", "Breakfast", "Pizza", "Pasta", "Indian mains", "Chinese", "Desserts", "Cold brew", "Shakes", "Catering"];
  const run = (cls: string) => (
    <div className="overflow-hidden whitespace-nowrap">
      <div className={`marquee flex w-max gap-10 font-display text-6xl md:text-8xl ${cls}`}>
        {[...words, ...words, ...words, ...words].map((w, i) => (
          <span key={i} className="flex items-center gap-10">{w} <span className="text-3xl">✦</span></span>
        ))}
      </div>
    </div>
  );
  return (
    <div aria-hidden className="-mt-px overflow-hidden bg-espresso pb-12 pt-4">
      <div className="-rotate-2 scale-105 space-y-2">
        <div className="bg-brand py-2 text-brand-foreground">{run("")}</div>
        <div className="bg-gold py-2 text-espresso">{run("marquee-rev italic")}</div>
      </div>
    </div>
  );
}

const tiles = ["bg-brand text-brand-foreground", "bg-gold text-[#2a1d17]", "bg-espresso text-[#fbf6ef]", "bg-sand text-foreground"];

async function CategoriesX() {
  const menu = await getMenu();
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-text">The menu</p>
        <h2 className="display mt-2 text-5xl leading-[0.95] md:text-7xl">What are you <em className="text-brand">craving?</em></h2>
      </Reveal>
      <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {menu.slice(0, 12).map((c, i) => (
          <li key={c.id} className="tilt">
            <Link href={`/menu#${c.slug}`} className={`group relative flex min-h-36 flex-col justify-between gap-2 overflow-hidden rounded-[2rem] p-4 md:aspect-square md:p-5 ${c.image ? "bg-espresso text-white" : tiles[i % tiles.length]}`}>
              {c.image && (
                <>
                  <Image src={c.image.url} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover transition duration-500 group-hover:scale-110" />
                  <span aria-hidden className={`absolute inset-0 ${["bg-brand/35", "bg-gold/25", "bg-black/20", "bg-black/10"][i % 4]} mix-blend-multiply`} />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                </>
              )}
              <span aria-hidden className={`display relative text-6xl leading-none md:text-8xl ${c.image ? "opacity-0" : "opacity-40"}`}>{c.name.charAt(0)}</span>
              <span className="relative">
                <span className="block text-lg font-semibold leading-tight">{c.name}</span>
                <span className="text-xs opacity-80">{c.items.length} items</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {menu.length > 12 && (
        <Link href="/menu" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-foreground/25 px-6 text-base font-semibold transition hover:bg-foreground/5 active:scale-95">
          See all {menu.length} sections <ArrowIcon width={18} height={18} />
        </Link>
      )}
    </section>
  );
}

async function WaysX() {
  const s = await getSettings();
  const ways = [
    { Icon: QrIcon, n: "01", title: "Dine in", text: "Scan the QR on your table. Your name, your number, done. The kitchen gets it instantly.", cls: "bg-brand text-brand-foreground" },
    { Icon: BagIcon, n: "02", title: "Takeaway", text: "Order from your phone, walk in when it's ready. No queue, no waiting at the counter.", cls: "bg-gold text-[#2a1d17]" },
    ...(s.flags.delivery ? [{ Icon: ScooterIcon, n: "03", title: "Delivery", text: `${formatPrice(s.delivery.base_fare)} for the first ${s.delivery.base_km} km, ${formatPrice(s.delivery.per_km)} per km after. Priced by distance, like a ride app.`, cls: "bg-espresso text-[#fbf6ef]" }] : []),
  ];
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-text">Order your way</p>
        <h2 className="display mt-2 text-5xl leading-[0.95] md:text-7xl">However you <em className="text-brand">like it.</em></h2>
      </Reveal>
      <ul className="stack mt-10 space-y-6">
        {ways.map(({ Icon, n, title, text, cls }, i) => (
          <li key={title} style={{ "--n": i } as React.CSSProperties}>
            <Link href="/menu" className={`group flex min-h-[20rem] flex-col justify-between rounded-[2.5rem] p-7 shadow-card md:min-h-[24rem] md:p-12 ${cls}`}>
              <span className="flex items-start justify-between">
                <span className="display text-7xl leading-none opacity-40 md:text-9xl">{n}</span>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-current/10"><Icon width={28} height={28} /></span>
              </span>
              <span>
                <span className="display block text-6xl leading-none md:text-8xl">{title}</span>
                <span className="mt-4 block max-w-md text-base opacity-85 md:text-lg">{text}</span>
                <span className="mt-5 inline-flex items-center gap-2 font-semibold">Start an order <ArrowIcon width={20} height={20} className="transition group-hover:translate-x-2" /></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function StatsX() {
  const [menu, s] = await Promise.all([getMenu(), getSettings()]);
  const dishes = menu.reduce((n, c) => n + c.items.length, 0);
  const mins = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const open = mins(s.hours.close) - mins(s.hours.open);
  const stats = [
    { n: dishes, label: "dishes on the menu" },
    { n: menu.length, label: "menu sections" },
    { n: s.flags.delivery ? 3 : 2, label: "ways to order" },
    { n: Math.floor(open / 60), suffix: open % 60 >= 30 ? "½" : "", label: "hours open, every day" },
  ];
  return (
    <section className="mt-24 bg-brand text-brand-foreground">
      <Wave className="-mb-px text-background" />
      <ul className={`${wrap} grid grid-cols-2 gap-8 py-14 md:grid-cols-4`}>
        {stats.map((x) => (
          <li key={x.label}>
            <CountUp to={x.n} suffix={x.suffix} className="display block text-7xl leading-none md:text-8xl" />
            <span className="mt-2 block text-sm font-medium opacity-90">{x.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScanX() {
  const steps = [
    ["Scan", "Point your camera at the QR on your table. The menu opens with your table already attached."],
    ["Choose", "Pick dishes, add a note, give your name and number. That's all we need."],
    ["Enjoy", "Watch it go from received to ready, live. Pay at the counter when you're done."],
  ];
  return (
    <section className="bg-espresso py-20 text-[#fbf6ef]">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2`}>
        <Reveal className="mx-auto">
          <div className="scan flex h-64 w-64 items-center justify-center rounded-[2.5rem] bg-[#fbf6ef] text-[#2a1d17] md:h-80 md:w-80">
            <QrIcon width={170} height={170} strokeWidth={1.2} />
          </div>
        </Reveal>
        <div>
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Table ordering</p>
            <h2 className="display mt-2 text-5xl leading-[0.95] md:text-7xl">Scan. Choose. <em className="text-gold">Enjoy.</em></h2>
          </Reveal>
          <ol className="mt-8 space-y-4">
            {steps.map(([t, d], i) => (
              <li key={t}>
                <Reveal delay={i * 0.1}>
                  <div className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <span className="display flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-2xl text-[#2a1d17]">{i + 1}</span>
                    <div>
                      <h3 className="text-xl font-semibold">{t}</h3>
                      <p className="mt-1 text-[#d9cbbd]">{d}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

async function ReelX() {
  const gallery = await getGallery();
  if (gallery.length < 4) return null;
  const shots = gallery.filter((_, i) => i !== 3 && i !== 5);
  const row = (rev: boolean) => (
    <div className="overflow-hidden">
      <div className={`marquee flex w-max gap-4 ${rev ? "marquee-rev" : ""}`} style={{ animationDuration: "70s" }}>
        {[...shots, ...shots, ...shots].map((g, i) => (
          <Image key={i} src={g.url} alt="" width={g.width} height={g.height} sizes="260px" placeholder="blur" blurDataURL={g.blur} className="tilt h-60 w-48 shrink-0 rounded-[2rem] object-cover md:h-80 md:w-60" />
        ))}
      </div>
    </div>
  );
  return (
    <section className="pt-20" aria-label="Photos of the cafe">
      <div className={wrap}>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-text">Inside Platter</p>
          <h2 className="display mt-2 text-5xl leading-[0.95] md:text-7xl">Come sit <em className="text-brand">with us.</em></h2>
        </Reveal>
      </div>
      <div className="mt-10 space-y-4">{row(false)}{row(true)}</div>
      <div className={`${wrap} mt-6`}>
        <Link href="/gallery" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand">See all photos <ArrowIcon width={18} height={18} /></Link>
      </div>
    </section>
  );
}

function ClosingX() {
  return (
    <section className="relative mt-24 overflow-hidden bg-espresso text-[#fbf6ef]">
      <Wave className="-mb-px text-background" />
      <Beans fall />
      <div className={`${wrap} relative flex min-h-[70svh] flex-col items-start justify-center gap-8 py-20`}>
        <h2 className="display text-[clamp(3.6rem,15vw,10rem)] leading-[0.88]">
          <span className="block"><SplitText text="See you" /></span>
          <span className="block text-gold italic"><SplitText text="at the table." delay={300} /></span>
        </h2>
        <Magnetic><Link href="/menu" className={primary}>Order now <ArrowIcon width={20} height={20} /></Link></Magnetic>
      </div>
    </section>
  );
}

export function HomeExpressive() {
  return (
    <main>
      <div className="scroll-bar" aria-hidden />
      <Suspense fallback={<div className="min-h-[80svh] bg-espresso" />}>
        <HeroX />
      </Suspense>
      <TickerX />
      <Suspense>
        <CategoriesX />
        <Picks />
        <WaysX />
        <StatsX />
      </Suspense>
      <ScanX />
      <Suspense>
        <ReelX />
        <Catering />
        <OffersTeaser />
        <Faq />
        <Visit />
      </Suspense>
      <ClosingX />
    </main>
  );
}

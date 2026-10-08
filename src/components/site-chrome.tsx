import Link from "next/link";
import { getSettings } from "@/lib/data/site";
import { formatTime } from "@/lib/hours";
import { telHref } from "@/lib/format";
import { AccountLink } from "./account-link";
import { OpenBadge } from "./open-badge";
import { Wordmark } from "./wordmark";
import { BottomNav, DesktopNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const { hours } = await getSettings();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Platter home" className="text-4xl leading-none">
            <Wordmark />
          </Link>
          <DesktopNav />
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <OpenBadge hours={hours} compact />
            <AccountLink className="inline-flex min-h-11 items-center whitespace-nowrap px-1 text-sm font-medium text-brand" />
          </div>
        </div>
      </header>
      <BottomNav />
    </>
  );
}

export async function SiteFooter() {
  const { contact, hours, legal } = await getSettings();
  const link = "inline-flex min-h-11 items-center text-white/70 transition hover:text-white";
  return (
    <footer className="mt-20 bg-espresso pb-40 text-white lg:pb-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Wordmark className="text-5xl !text-white" />
          <p className="mt-2 text-sm text-white/60">{legal.tagline}</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">Coffee, breakfast, pizza, pasta and Indian mains in the heart of Jhalana, Jaipur.</p>
          <OpenBadge hours={hours} className="mt-5" />
        </div>
        <nav aria-label="Explore" className="text-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Explore</h2>
          <ul>
            {[["/menu", "Menu"], ["/offers", "Offers"], ["/gallery", "Gallery"], ["/about", "About"], ["/contact", "Contact"]].map(([h, l]) => (
              <li key={h}><Link className={link} href={h}>{l}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account and legal" className="text-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">You</h2>
          <ul>
            <li><AccountLink className={link} /></li>
            <li><Link className={link} href="/privacy">Privacy policy</Link></li>
            <li><a className={link} href={contact.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li>
          </ul>
        </nav>
        <address className="text-sm not-italic leading-relaxed">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Visit</h2>
          <p className="text-white/70">{contact.address}</p>
          <p className="mt-3 text-white/70">Every day, {formatTime(hours.open)} to {formatTime(hours.close)}</p>
          <p className="mt-3"><a className="inline-flex min-h-11 items-center font-medium text-white underline-offset-4 hover:underline" href={telHref(contact.phone)}>{contact.phone.replace("+91", "+91 ")}</a></p>
          <p><a className="inline-flex min-h-11 items-center text-white/70 underline-offset-4 hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>
        </address>
      </div>
      <div className="mx-auto max-w-6xl border-t border-white/10 px-4 pt-6 text-xs leading-relaxed text-white/50">
        FSSAI Lic. No. {legal.fssai} · GST {legal.gst_number} · {legal.entity}. Menu prices as shown in the cafe; taxes as applicable.
      </div>
    </footer>
  );
}

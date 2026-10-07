"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountLink } from "./account-link";
import { CartButton } from "./cart-button";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/offers", label: "Offers" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

export function DesktopNav() {
  const active = useActive();
  return (
    <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
      {[...links.slice(0, 4), { href: "/about", label: "About" }, { href: "/blog", label: "Blog" }, links[4]].map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? "page" : undefined}
          className={`inline-flex min-h-11 items-center text-sm font-medium transition-colors hover:text-brand ${active(l.href) ? "text-brand" : "text-foreground"}`}
        >
          {l.label}
        </Link>
      ))}
      <AccountLink className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border px-4 text-sm font-medium transition-colors hover:border-brand hover:text-brand" />
      <ThemeToggle />
      <CartButton variant="header" />
    </nav>
  );
}

/** Thumb-reach navigation for phones: Home, Menu, Cart in the middle, Offers, Contact. */
export function BottomNav() {
  const active = useActive();
  const tab = (l: { href: string; label: string }) => (
    <li key={l.href}>
      <Link
        href={l.href}
        aria-current={active(l.href) ? "page" : undefined}
        className={`flex min-h-14 items-center justify-center text-xs font-medium transition-colors active:scale-95 ${active(l.href) ? "text-brand" : "text-muted"}`}
      >
        {l.label}
      </Link>
    </li>
  );
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {tab(links[0])}
        {tab(links[1])}
        <li><CartButton variant="tab" /></li>
        {tab(links[2])}
        {tab(links[4])}
      </ul>
    </nav>
  );
}

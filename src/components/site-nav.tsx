"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
      {/* Blog stays out of the nav until it has posts; the page itself still works. */}
      {[...links.slice(0, 4), { href: "/about", label: "About" }, links[4]].map((l) => (
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

const more = [
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy policy" },
];

/** Everything that does not fit in the tab bar, in a small menu above it. Escape, an outside tap or going to another page closes it. */
function MoreMenu() {
  const active = useActive();
  const path = usePathname();
  // Remembers which page it was opened on, so moving to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const box = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenOn(null);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const on = more.some((l) => active(l.href)) || active("/account");
  const item = "flex min-h-12 items-center px-4 text-sm font-medium transition-colors hover:bg-background";
  return (
    <li ref={box} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="more-menu"
        onClick={() => setOpenOn(open ? null : path)}
        className={`flex min-h-14 w-full items-center justify-center text-xs font-medium transition-colors active:scale-95 ${on || open ? "text-brand" : "text-muted"}`}
      >
        More
      </button>
      {open && (
        <ul id="more-menu" className="absolute bottom-full right-2 mb-2 w-52 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-card">
          {more.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={() => setOpenOn(null)} aria-current={active(l.href) ? "page" : undefined} className={`${item} ${active(l.href) ? "text-brand" : "text-foreground"}`}>
                {l.label}
              </Link>
            </li>
          ))}
          <li className="border-t border-border">
            <AccountLink className={`${item} text-foreground`} />
          </li>
        </ul>
      )}
    </li>
  );
}

/** Thumb-reach navigation for phones: Home, Menu, Cart in the middle, Offers, More. */
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
        <MoreMenu />
      </ul>
    </nav>
  );
}

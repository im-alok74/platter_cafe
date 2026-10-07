"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  // The first link is the section home, so it matches exactly; the others match their sub-pages too.
  const active = (h: string) => (h === links[0].href ? path === h : path.startsWith(h));
  return (
    <nav aria-label="Admin" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          prefetch={false}
          aria-current={active(l.href) ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition active:scale-95 ${active(l.href) ? "border-espresso bg-espresso text-[#fbf6ef]" : "border-border bg-surface"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

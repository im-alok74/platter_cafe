"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ComponentType, type ReactNode, type SVGProps } from "react";
import { BagIcon, FlameIcon, GridIcon, KeyIcon, ListIcon, LogoutIcon, PaletteIcon, PlusCircleIcon, QrIcon, ReceiptIcon, ScooterIcon, TagIcon, UsersIcon, UtensilsIcon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";

const ICONS = { grid: GridIcon, receipt: ReceiptIcon, flame: FlameIcon, utensils: UtensilsIcon, tag: TagIcon, plus: PlusCircleIcon, scooter: ScooterIcon, qr: QrIcon, palette: PaletteIcon, users: UsersIcon, list: ListIcon, key: KeyIcon, bag: BagIcon } satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;
export type IconName = keyof typeof ICONS;
export type NavGroup = { title: string; links: { href: string; label: string; icon: IconName }[] };

const roleLabel: Record<string, string> = { owner: "Owner", manager: "Manager", kitchen: "Kitchen" };

/** Sidebar on desktop, scrolling pills on phones. The server decides which links each role gets; this only draws them. */
export function AdminShell({ email, role, groups, signOut, children }: { email: string; role: string; groups: NavGroup[]; signOut: () => Promise<void>; children: ReactNode }) {
  const path = usePathname();
  const flat = groups.flatMap((g) => g.links);
  // "/admin" matches only itself; every other link also matches its sub-pages.
  const active = (href: string) => (href === "/admin" ? path === href : path === href || path.startsWith(href + "/"));
  const pills = useRef<HTMLElement>(null);
  // Keep the current page's pill in view on phones, where the row scrolls sideways.
  useEffect(() => {
    pills.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [path]);

  return (
    <div className="lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-espresso text-[#fbf6ef] lg:sticky lg:top-0 lg:flex lg:h-svh">
        <div className="px-6 pb-2 pt-6">
          <Link href="/admin" aria-label="Admin home" className="text-4xl leading-none"><Wordmark className="!text-gold" /></Link>
        </div>
        <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((g) => (
            <div key={g.title} className="mt-5">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b5a596]">{g.title}</p>
              <ul className="mt-1.5 space-y-0.5">
                {g.links.map((l) => {
                  const Icon = ICONS[l.icon];
                  const on = active(l.href);
                  return (
                    <li key={l.href}>
                      <Link href={l.href} prefetch={false} aria-current={on ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${on ? "bg-white/10 text-gold" : "text-[#d9cbbd] hover:bg-white/5"}`}>
                        <Icon width={19} height={19} />
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="mb-3 text-xs text-gold">{roleLabel[role] ?? role}</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Link href="/" prefetch={false} className="flex min-h-10 items-center justify-center rounded-xl bg-white/5 text-sm font-medium text-[#d9cbbd] transition hover:bg-white/10">View website</Link>
            <a href="/menu" target="_blank" rel="noopener" className="flex min-h-10 items-center justify-center rounded-xl bg-white/5 text-sm font-medium text-[#d9cbbd] transition hover:bg-white/10">View menu</a>
          </div>
          <form action={signOut}>
            <button className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/20 text-sm font-medium transition hover:bg-white/5 active:scale-95">
              <LogoutIcon width={18} height={18} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="bg-espresso text-[#fbf6ef] lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/admin" aria-label="Admin home" className="text-3xl leading-none"><Wordmark className="!text-gold" /></Link>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold">{roleLabel[role] ?? role}</span>
              <form action={signOut}>
                <button aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition active:scale-95"><LogoutIcon width={18} height={18} /></button>
              </form>
            </div>
          </div>
          <div className="flex gap-4 px-4 pb-2 text-xs font-medium text-[#d9cbbd]">
            <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">View website</Link>
            <a href="/menu" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">View menu ↗</a>
          </div>
          <nav ref={pills} aria-label="Admin" className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
            {flat.map((l) => (
              <Link key={l.href} href={l.href} prefetch={false} aria-current={active(l.href) ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition active:scale-95 ${active(l.href) ? "bg-gold text-espresso" : "bg-white/10 text-[#e8dccf]"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 lg:px-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}

"use client";
import { m } from "motion/react";
import { Beans, SplitText, Steam } from "@/components/fx/fx";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { inWindow, istClock } from "@/lib/hours";
import type { MenuCategory, MenuItem } from "@/lib/data/menu";

/** Ordering hooks. Without them the menu is read-only (public /menu page). */
export type Ordering = {
  lines: CartLine[];
  onOpen: (item: MenuItem) => void;
  onAdd: (item: MenuItem, variantId: string | null) => void;
  onQty: (key: string, qty: number) => void;
};

const badgeStyle: Record<string, string> = {
  Bestseller: "bg-brand text-brand-foreground",
  "Must Try": "bg-foreground text-background",
  "Student Favourite": "bg-info text-background",
};

function VegMark({ veg }: { veg: boolean }) {
  const c = veg ? "border-veg" : "border-nonveg";
  return (
    <span role="img" aria-label={veg ? "Vegetarian" : "Non-vegetarian"} className={`inline-flex h-5 w-5 items-center justify-center rounded-[4px] border-2 bg-surface/90 ${c}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${veg ? "bg-veg" : "bg-nonveg"}`} />
    </span>
  );
}

/** Photo, or a soft placeholder until the owner uploads one. */
function Media({ item }: { item: MenuItem }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-border">
      {item.image ? (
        <Image src={item.image.url} alt="" fill sizes="(min-width: 768px) 33vw, 50vw" placeholder={item.image.blur_data_url ? "blur" : "empty"} blurDataURL={item.image.blur_data_url ?? undefined} className="object-cover" />
      ) : (
        <div aria-hidden className="flex h-full w-full items-center justify-center bg-sand">
          <span className="font-display text-6xl text-brand/35">{item.name.charAt(0)}</span>
        </div>
      )}
      <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
        {item.badges.map((b) => (
          <span key={b} className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeStyle[b] ?? "bg-foreground text-background"}`}>{b}</span>
        ))}
      </div>
      <div className="absolute right-2 top-2"><VegMark veg={item.is_veg} /></div>
      {item.sold_out && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-semibold uppercase tracking-wide">Sold out</div>
      )}
    </div>
  );
}

function MenuCard({ item, ordering }: { item: MenuItem; ordering?: Ordering }) {
  const [variantId, setVariantId] = useState<string | null>(item.variants[0]?.id ?? null);
  const variant = item.variants.find((v) => v.id === variantId) ?? null;
  const price = variant?.price ?? item.price;
  // The plain version of this dish (no extras, no note) is the one the card's stepper controls.
  const line = ordering?.lines.find((l) => l.itemId === item.id && l.variantId === variantId && l.addonIds.length === 0 && !l.note);
  const total = ordering?.lines.filter((l) => l.itemId === item.id).reduce((n, l) => n + l.qty, 0) ?? 0;

  const photo = Boolean(item.image);
  const head = (
    <>
      {photo && <Media item={item} />}
      <span className="block px-3 pt-3">
        {!photo && (item.badges.length > 0 || item.sold_out) && (
          <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {item.badges.map((b) => (
              <span key={b} className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeStyle[b] ?? "bg-foreground text-background"}`}>{b}</span>
            ))}
            {item.sold_out && <span className="rounded-md bg-nonveg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">Sold out</span>}
          </span>
        )}
        {ordering ? (
          <m.span layoutId={`item-${item.id}`} className="flex items-center gap-2 font-semibold leading-snug">{!photo && <VegMark veg={item.is_veg} />}{item.name}</m.span>
        ) : (
          <span className="flex items-center gap-2 font-semibold leading-snug">{!photo && <VegMark veg={item.is_veg} />}{item.name}</span>
        )}
        {item.description && <span className="mt-1 line-clamp-2 block text-sm text-muted">{item.description}</span>}
      </span>
    </>
  );

  return (
    <li className={`tilt flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition hover:-translate-y-0.5 ${photo ? "" : "col-span-2 md:col-span-1"} ${item.sold_out ? "opacity-70" : ""}`}>
      {ordering ? (
        <button type="button" onClick={() => ordering.onOpen(item)} disabled={item.sold_out} className="block text-left" aria-label={`${item.name}, ${formatPrice(price)}${total ? `, ${total} in your order` : ""}. Open details`}>
          {head}
        </button>
      ) : (
        <div>{head}</div>
      )}

      <div className="mt-auto px-3 pb-3 pt-2">
        {item.variants.length > 0 && (
          <div role="group" aria-label={`Options for ${item.name}`} className="mb-2 flex flex-wrap gap-1.5">
            {item.variants.map((v) => (
              <button key={v.id} type="button" aria-pressed={variantId === v.id} onClick={() => setVariantId(v.id)} className={`min-h-8 rounded-md border px-2.5 text-xs font-medium transition active:scale-95 ${variantId === v.id ? "border-brand bg-brand/10 text-brand" : "border-border text-muted"}`}>
                {v.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold tabular-nums">{formatPrice(price)}</span>
          {ordering && !item.sold_out && (
            line ? (
              <span role="group" aria-label={`Quantity of ${item.name}`} className="flex items-center overflow-hidden rounded-lg border border-brand bg-brand/10">
                <button type="button" aria-label="One less" className="flex h-10 w-9 items-center justify-center text-lg font-semibold text-brand active:bg-brand/20" onClick={() => ordering.onQty(line.key, line.qty - 1)}>−</button>
                <m.span key={line.qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">{line.qty}</m.span>
                <button type="button" aria-label="One more" disabled={line.qty >= 20} className="flex h-10 w-9 items-center justify-center text-lg font-semibold text-brand active:bg-brand/20" onClick={() => ordering.onQty(line.key, line.qty + 1)}>+</button>
              </span>
            ) : (
              <button type="button" onClick={() => (item.addons.length > 0 ? ordering.onOpen(item) : ordering.onAdd(item, variantId))} className="min-h-10 rounded-lg bg-brand px-4 text-sm font-bold tracking-wide text-brand-foreground transition active:scale-95">
                ADD
              </button>
            )
          )}
        </div>
      </div>
    </li>
  );
}

export function MenuBrowser({ categories, ordering, summary }: { categories: MenuCategory[]; ordering?: Ordering; summary?: string }) {
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const chipRow = useRef<HTMLDivElement>(null);

  // Time-based visibility needs the visitor's clock: null on the server, the real time in the browser.
  const minutes = useSyncExternalStore(
    () => () => {},
    () => istClock().minutes,
    () => null,
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = categories
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) =>
            (!vegOnly || i.is_veg) &&
            (!q || i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)) &&
            (minutes === null || inWindow(minutes, i.available_from, i.available_to)),
        ),
      }))
      .filter((c) => c.items.length > 0);
    // Today's specials also get their own section at the top, like a board by the counter.
    const specials = filtered.flatMap((c) => (c.slug === "favourites" ? [] : c.items)).filter((i) => i.is_special);
    return specials.length ? [{ id: "specials", name: "Today's Special", slug: "specials", delivery_available: true, image: null, items: specials }, ...filtered] : filtered;
  }, [categories, query, vegOnly, minutes]);

  // Scroll-spy: highlight the category nearest the top.
  useEffect(() => {
    const els = shown.map((c) => document.getElementById(c.slug)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-130px 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [shown]);

  useEffect(() => {
    chipRow.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const total = shown.filter((c) => c.slug !== "specials" && c.slug !== "favourites").reduce((n, c) => n + c.items.length, 0);

  return (
    <>
      <div className="relative isolate overflow-hidden bg-espresso text-[#fbf6ef]">
        <div className="fx-only"><Beans count={4} /></div>
        <div className="relative mx-auto max-w-5xl px-4 pb-7 pt-7">
          <Steam className="fx-only absolute right-6 top-4 h-20 w-14 text-[#fbf6ef]/70 md:right-0" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Eat &amp; drink</p>
          <h2 className="display mt-2 text-5xl [[data-template=expressive]_&]:text-6xl md:[[data-template=expressive]_&]:text-8xl"><SplitText text="Our menu" /></h2>
          <p className="mt-2 text-sm text-[#d9cbbd]">{summary ?? "Pick what you like."} · {total} {total === 1 ? "item" : "items"}</p>
        </div>
      </div>

      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu"
              aria-label="Search the menu"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-base outline-none focus:border-brand"
            />
            <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" role="switch" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="peer sr-only" />
              <span className="relative h-6 w-10 rounded-full bg-border transition-colors peer-checked:bg-veg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
              Veg
            </label>
          </div>
          <div ref={chipRow} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
            {shown.map((c) => (
              <a
                key={c.id}
                data-slug={c.slug}
                href={`#${c.slug}`}
                aria-current={active === c.slug ? "true" : undefined}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${active === c.slug ? "border-espresso bg-espresso text-[#fbf6ef]" : "border-border bg-surface"}`}
              >
                {c.name}
                <span className={`text-xs ${active === c.slug ? "opacity-80" : "text-muted"}`}>{c.items.length}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-8">
        {shown.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-display text-xl">Nothing matches that</p>
            <p className="mt-1 text-muted">Try a different word, or clear the filters.</p>
            <button onClick={() => { setQuery(""); setVegOnly(false); }} className="mt-4 min-h-11 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground">Clear filters</button>
          </div>
        )}
        {shown.map((c) => (
          <section key={c.id} id={c.slug} className="scroll-mt-48 pt-8">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="font-display text-2xl">{c.name}</h3>
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-brand/50 to-transparent" />
              <span className="text-sm text-muted">{c.items.length} {c.items.length === 1 ? "item" : "items"}</span>
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {c.items.map((i) => (
                <MenuCard key={`${c.id}-${i.id}`} item={i} ordering={ordering} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

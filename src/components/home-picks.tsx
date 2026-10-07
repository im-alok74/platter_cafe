"use client";
import Image from "next/image";
import { cartUi } from "@/lib/cart-ui";
import type { MenuItem } from "@/lib/data/menu";
import { formatPrice } from "@/lib/format";
import { useOrdering } from "@/lib/use-ordering";

function VegMark({ veg }: { veg: boolean }) {
  return (
    <span role="img" aria-label={veg ? "Vegetarian" : "Non-vegetarian"} className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 bg-surface/90 ${veg ? "border-veg" : "border-nonveg"}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${veg ? "bg-veg" : "bg-nonveg"}`} />
    </span>
  );
}

/** Swipeable row of dishes on the home page, with ADD so people can start an order without leaving it.
 *  A dish with a photo gets a photo card; one without gets a compact card, never an empty picture tile. */
export function HomePicks({ items }: { items: MenuItem[] }) {
  const ordering = useOrdering(cartUi.openItem);
  const add = (i: MenuItem) => (i.addons.length > 0 || i.variants.length > 0 ? ordering.onOpen(i) : ordering.onAdd(i, null));
  const addBtn = (i: MenuItem, qty: number | undefined) =>
    qty ? (
      <span className="text-xs font-semibold text-brand">{qty} added</span>
    ) : (
      <button type="button" onClick={() => add(i)} aria-label={`Add ${i.name}`} className="min-h-11 rounded-full border border-brand px-5 text-xs font-bold tracking-wide text-brand transition active:scale-95">
        ADD
      </button>
    );

  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
      {items.map((i) => {
        const qty = ordering.lines.find((l) => l.itemId === i.id && l.addonIds.length === 0 && !l.note)?.qty;
        if (i.image)
          return (
            <li key={i.id} className="w-44 shrink-0 snap-start rounded-3xl border border-border bg-surface p-2.5 shadow-card md:w-auto">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-sand">
                <Image src={i.image.url} alt="" fill sizes="(min-width: 1024px) 25vw, 176px" className="object-cover" />
                <span className="absolute right-2 top-2"><VegMark veg={i.is_veg} /></span>
              </div>
              <p className="mt-2.5 line-clamp-2 min-h-10 px-1 text-sm font-semibold leading-snug">{i.name}</p>
              <div className="mt-1 flex items-center justify-between px-1 pb-0.5">
                <span className="font-bold tabular-nums">{formatPrice(i.price)}</span>
                {addBtn(i, qty)}
              </div>
            </li>
          );
        return (
          <li key={i.id} className="flex w-60 shrink-0 snap-start flex-col justify-between gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card md:w-auto">
            <div className="flex items-start gap-2.5">
              <VegMark veg={i.is_veg} />
              <div className="min-w-0">
                <p className="line-clamp-2 text-base font-semibold leading-snug">{i.name}</p>
                {i.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{i.description}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="display text-2xl tabular-nums">{formatPrice(i.price)}</span>
              {addBtn(i, qty)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

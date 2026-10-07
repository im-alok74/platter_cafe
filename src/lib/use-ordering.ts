"use client";
import type { Ordering } from "@/app/(site)/menu/menu-browser";
import { cart, useCart } from "@/lib/cart";
import type { MenuItem } from "@/lib/data/menu";

/** Handlers that make the menu cards orderable: ADD, the quantity stepper, and opening the detail sheet. */
export function useOrdering(onOpen: (item: MenuItem) => void): Ordering {
  const { lines } = useCart();
  return {
    lines,
    onOpen,
    onQty: (key, qty) => cart.setQty(key, qty),
    // One tap for a dish with no extras to choose: add it straight away.
    onAdd: (item, variantId) => {
      const v = item.variants.find((x) => x.id === variantId) ?? null;
      cart.add({ itemId: item.id, name: item.name, isVeg: item.is_veg, variantId: v?.id ?? null, variantName: v?.name ?? null, addonIds: [], addonNames: [], unitPrice: v?.price ?? item.price, qty: 1, note: "" });
      navigator.vibrate?.(12);
    },
  };
}

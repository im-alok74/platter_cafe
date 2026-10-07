import type { CartLine } from "./cart";

export type CatalogItem = { name: string; isVeg: boolean; price: number; soldOut: boolean; variants: { id: string; name: string; price: number }[]; addons: { id: string; name: string; price: number }[] };
export type PastLine = { item_id: string | null; name: string; variant_name: string | null; qty: number; addons: { id: string; name: string }[] };

/**
 * Rebuilds a past order from today's menu: today's prices, today's options. Anything sold out, removed, or whose option
 * no longer exists is skipped and reported, never guessed.
 */
export function buildReorderLines(past: PastLine[], catalog: Record<string, CatalogItem>) {
  const lines: Omit<CartLine, "key">[] = [];
  const skipped: string[] = [];
  for (const it of past) {
    const c = it.item_id ? catalog[it.item_id] : undefined;
    if (!it.item_id || !c || c.soldOut) { skipped.push(it.name); continue; }
    const variant = c.variants.length ? c.variants.find((v) => v.name === it.variant_name) : undefined;
    if (c.variants.length && !variant) { skipped.push(it.name); continue; }
    const addons = c.addons.filter((a) => it.addons.some((x) => x.id === a.id));
    lines.push({
      itemId: it.item_id, name: c.name, isVeg: c.isVeg, variantId: variant?.id ?? null, variantName: variant?.name ?? null,
      addonIds: addons.map((a) => a.id), addonNames: addons.map((a) => a.name),
      unitPrice: (variant?.price ?? c.price) + addons.reduce((n, a) => n + a.price, 0), qty: it.qty, note: "",
    });
  }
  return { lines, skipped, added: lines.reduce((n, l) => n + l.qty, 0) };
}

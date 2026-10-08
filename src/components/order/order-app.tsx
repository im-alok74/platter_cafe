"use client";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { requestService } from "@/app/t/[code]/actions";
import { MenuBrowser } from "@/app/(site)/menu/menu-browser";
import { Wordmark } from "@/components/wordmark";
import { useCart } from "@/lib/cart";
import type { DeliveryRules } from "@/lib/delivery";
import { useOrdering } from "@/lib/use-ordering";
import type { MenuCategory, MenuItem } from "@/lib/data/menu";
import { formatPrice } from "@/lib/format";
import { formatTime, type Hours } from "@/lib/hours";
import { useOpen } from "@/lib/use-open";
import { createClient } from "@/lib/supabase/browser";
import { spring } from "@/lib/motion/tokens";
import { CartDrawer } from "./cart-drawer";
import { ItemSheet } from "./item-sheet";

/** The order from the last few hours, so a guest who left the tracking page can get back to it. Returns an id or null. */
const lastOrderSnapshot = () => {
  try {
    const o = JSON.parse(localStorage.getItem("platter.lastOrder") ?? "null") as { id: string; at: number } | null;
    return o && Date.now() - o.at < 6 * 3600_000 ? o.id : null;
  } catch {
    return null;
  }
};

const useLastOrder = () => useSyncExternalStore(() => () => {}, lastOrderSnapshot, () => null);

type Customer = { id: string; name: string; phone: string };

export function OrderApp({ code, tableLabel, categories, gstPercent, whatsapp, delivery, hours, customer, favouriteIds }: { code: string; tableLabel: string; categories: MenuCategory[]; gstPercent: number; whatsapp: string; delivery: DeliveryRules; hours: Hours; customer: Customer | null; favouriteIds: string[] }) {
  const { count, subtotal } = useCart();
  const [sheet, setSheet] = useState<MenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState("");
  const lastOrder = useLastOrder();
  const closed = useOpen(hours) ? null : `Closed now — opens at ${formatTime(hours.open)}`;
  const [favs, setFavs] = useState(() => new Set(favouriteIds));

  // Remember the table for this visit, so "Order again" and the account pages can send the guest back here.
  useEffect(() => {
    try {
      localStorage.setItem("platter.bench", JSON.stringify({ code, label: tableLabel, at: Date.now() }));
    } catch {
      /* storage blocked */
    }
  }, [code, tableLabel]);

  async function toggleFav(item: MenuItem) {
    if (!customer) return;
    const on = !favs.has(item.id);
    setFavs((s) => { const n = new Set(s); if (on) n.add(item.id); else n.delete(item.id); return n; });
    navigator.vibrate?.(10);
    const db = createClient();
    const { error } = on ? await db.from("favourites").insert({ user_id: customer.id, item_id: item.id }) : await db.from("favourites").delete().eq("user_id", customer.id).eq("item_id", item.id);
    if (error) setFavs((s) => { const n = new Set(s); if (on) n.delete(item.id); else n.add(item.id); return n; });
  }

  // A "Your favourites" section at the top of the menu for signed-in customers.
  const shownCategories = useMemo(() => {
    if (favs.size === 0) return categories;
    const items = categories.flatMap((c) => c.items).filter((i) => favs.has(i.id));
    return items.length ? [{ id: "favourites", name: "Your favourites", slug: "favourites", delivery_available: true, image: null, items }, ...categories] : categories;
  }, [categories, favs]);

  const ordering = useOrdering(setSheet);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  async function ask(kind: "waiter" | "bill") {
    setHelp(false);
    const res = await requestService(code, kind);
    setToast(res.ok ? (kind === "waiter" ? "A waiter is on the way." : "The bill is being prepared.") : (res.error ?? "Could not send that. Please wave to the staff."));
    if (res.ok) navigator.vibrate?.(15);
  }

  return (
    <div className="flex-1 pb-28">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Platter home" className="text-3xl leading-none"><Wordmark /></Link>
          <span className="inline-flex min-h-9 items-center rounded-full bg-brand px-3 text-sm font-semibold text-brand-foreground" aria-label={`You are at ${tableLabel}`}>
            You&apos;re at {tableLabel}
          </span>
          <div className="relative">
            <button onClick={() => setHelp((v) => !v)} aria-expanded={help} aria-haspopup="menu" className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium transition active:scale-95">
              Help
            </button>
            {help && (
              <div role="menu" className="absolute right-0 top-12 w-48 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                <button role="menuitem" className="block min-h-12 w-full px-4 text-left text-sm hover:bg-background" onClick={() => ask("waiter")}>Call a waiter</button>
                <button role="menuitem" className="block min-h-12 w-full border-t border-border px-4 text-left text-sm hover:bg-background" onClick={() => ask("bill")}>Request the bill</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {closed && (
        <p role="status" className="mx-auto mt-3 flex min-h-11 max-w-3xl items-center justify-center rounded-2xl bg-nonveg/10 px-4 text-center text-sm font-medium text-nonveg" style={{ width: "calc(100% - 2rem)" }}>
          {closed}. You can browse the menu, but ordering is paused.
        </p>
      )}

      {lastOrder && (
        <Link href={`/order/${lastOrder}`} className="mx-auto mt-3 flex min-h-11 max-w-3xl items-center justify-between rounded-2xl bg-info/10 px-4 text-sm font-medium text-info" style={{ width: "calc(100% - 2rem)" }}>
          Track your order <span aria-hidden>→</span>
        </Link>
      )}

      <h1 className="sr-only">Menu for {tableLabel}</h1>
      <MenuBrowser categories={shownCategories} ordering={ordering} summary={`Ordering for ${tableLabel}`} />

      <AnimatePresence>{sheet && <ItemSheet key={sheet.id} item={sheet} onClose={() => setSheet(null)} onAdded={() => setSheet(null)} favourite={customer ? { on: favs.has(sheet.id), toggle: () => toggleFav(sheet) } : undefined} />}</AnimatePresence>
      <AnimatePresence>{drawer && <CartDrawer code={code} tableLabel={tableLabel} gstPercent={gstPercent} whatsapp={whatsapp} delivery={delivery} deliveryEnabled={false} prefill={customer ? { name: customer.name, phone: customer.phone } : null} closed={closed} onClose={() => setDrawer(false)} />}</AnimatePresence>

      <AnimatePresence>
        {count > 0 && !drawer && !sheet && (
          <m.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring} className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button onClick={() => setDrawer(true)} className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-between rounded-full bg-brand px-5 text-brand-foreground shadow-card transition active:scale-[0.98]">
              <span className="flex items-center gap-3 font-semibold">
                <m.span key={count} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={spring} className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-foreground px-1.5 text-sm text-brand tabular-nums">{count}</m.span>
                View order
              </span>
              <span className="font-semibold tabular-nums">{formatPrice(subtotal)} <span className="text-xs font-medium opacity-80">+ GST</span></span>
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <m.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-card">{toast}</m.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

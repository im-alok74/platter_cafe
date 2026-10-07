"use client";
import { AnimatePresence, m } from "motion/react";
import { useCart } from "@/lib/cart";
import type { DeliveryRules } from "@/lib/delivery";
import { cartUi, useCartUi } from "@/lib/cart-ui";
import { useSavedBench } from "@/lib/bench";
import { formatPrice } from "@/lib/format";
import { spring } from "@/lib/motion/tokens";
import { MotionProvider } from "../motion";
import { CartDrawer } from "./cart-drawer";
import { ItemSheet } from "./item-sheet";

/** Cart for the public website: the item sheet, the order drawer and the floating bar, available on every page. */
export function CartHost({ gstPercent, whatsapp, delivery, deliveryEnabled }: { gstPercent: number; whatsapp: string; delivery: DeliveryRules; deliveryEnabled: boolean }) {
  const { count, subtotal } = useCart();
  const { drawer, item } = useCartUi();
  const bench = useSavedBench();

  return (
    <MotionProvider full>
      <AnimatePresence>{item && <ItemSheet key={item.id} item={item} onClose={cartUi.closeItem} onAdded={cartUi.closeItem} />}</AnimatePresence>
      <AnimatePresence>
        {drawer && <CartDrawer code={bench?.code ?? null} tableLabel={bench?.label ?? null} gstPercent={gstPercent} whatsapp={whatsapp} delivery={delivery} deliveryEnabled={deliveryEnabled} prefill={null} onClose={cartUi.closeDrawer} />}
      </AnimatePresence>
      <AnimatePresence>
        {count > 0 && !drawer && !item && (
          <m.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring} className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 md:bottom-0 md:pb-4">
            <button onClick={cartUi.openDrawer} className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-between rounded-full bg-brand px-5 text-brand-foreground shadow-card transition active:scale-[0.98]">
              <span className="flex items-center gap-3 font-semibold">
                <m.span key={count} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={spring} className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-foreground px-1.5 text-sm text-brand tabular-nums">{count}</m.span>
                View order
              </span>
              <span className="font-semibold tabular-nums">{formatPrice(subtotal)}</span>
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </MotionProvider>
  );
}

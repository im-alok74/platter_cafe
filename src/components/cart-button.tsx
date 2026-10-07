"use client";
import { useCart } from "@/lib/cart";
import { cartUi } from "@/lib/cart-ui";

function BagIcon() {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

/** Opens the order drawer from any page. The count shows what is in the cart. */
export function CartButton({ variant }: { variant: "header" | "tab" }) {
  const { count } = useCart();
  const badge = count > 0 && (
    <span key={count} className="bump absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-brand-foreground tabular-nums">{count}</span>
  );
  if (variant === "tab")
    return (
      <button onClick={cartUi.openDrawer} aria-label={`Your order, ${count} ${count === 1 ? "item" : "items"}`} className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted transition active:scale-95">
        <span className="relative"><BagIcon />{badge}</span>
        Cart
      </button>
    );
  return (
    <button onClick={cartUi.openDrawer} aria-label={`Your order, ${count} ${count === 1 ? "item" : "items"}`} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-surface transition hover:border-brand active:scale-95">
      <BagIcon />{badge}
    </button>
  );
}

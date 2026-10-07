"use client";
import { m, useDragControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { MenuItem } from "@/lib/data/menu";
import { duration, spring } from "@/lib/motion/tokens";

/** Swipe-down handle area shared by the item sheet and the cart drawer. */
export function SheetFrame({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const controls = useDragControls();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <m.button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.fast }} />
      <m.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[92svh] w-full max-w-xl flex-col rounded-t-[var(--radius-sheet)] bg-background shadow-card outline-none"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={spring}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => (info.offset.y > 110 || info.velocity.y > 600) && onClose()}
      >
        <div className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center" onPointerDown={(e) => controls.start(e)} aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </div>
        {children}
      </m.div>
    </div>
  );
}

export function ItemSheet({ item, onClose, onAdded, favourite }: { item: MenuItem; onClose: () => void; onAdded: () => void; favourite?: { on: boolean; toggle: () => void } }) {
  const [variantId, setVariantId] = useState<string | null>(item.variants[0]?.id ?? null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const variant = item.variants.find((v) => v.id === variantId) ?? null;
  const addons = item.addons.filter((a) => addonIds.includes(a.id));
  const unit = (variant?.price ?? item.price) + addons.reduce((n, a) => n + a.price, 0);

  function add() {
    cart.add({
      itemId: item.id,
      name: item.name,
      isVeg: item.is_veg,
      variantId,
      variantName: variant?.name ?? null,
      addonIds,
      addonNames: addons.map((a) => a.name),
      unitPrice: unit,
      qty,
      note: note.trim(),
    });
    navigator.vibrate?.(12);
    onAdded();
  }

  const stepper = "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-xl transition active:scale-90 disabled:opacity-40";

  return (
    <SheetFrame label={item.name} onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <m.h2 layoutId={`item-${item.id}`} className="font-display text-2xl leading-tight">{item.name}</m.h2>
          {favourite && (
            <button onClick={favourite.toggle} aria-pressed={favourite.on} aria-label={favourite.on ? "Remove from favourites" : "Add to favourites"} className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90">
              <m.svg key={String(favourite.on)} width="26" height="26" viewBox="0 0 24 24" initial={{ scale: favourite.on ? 0.6 : 1 }} animate={{ scale: 1 }} transition={spring} fill={favourite.on ? "var(--brand)" : "none"} stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round">
                <path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 2.9 5 6.3 5c2 0 3.4 1.1 4.2 2.4h3C14.3 6.1 15.7 5 17.7 5 21.1 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z" />
              </m.svg>
            </button>
          )}
        </div>
        {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}

        {item.variants.length > 0 && (
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">Choose one</legend>
            <div className="space-y-2">
              {item.variants.map((v) => (
                <label key={v.id} className={`flex min-h-12 cursor-pointer items-center justify-between rounded-xl border px-4 ${variantId === v.id ? "border-brand bg-brand/5" : "border-border bg-surface"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="h-5 w-5 accent-[var(--brand)]" />
                    {v.name}
                  </span>
                  <span className="tabular-nums text-muted">{formatPrice(v.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {item.addons.length > 0 && (
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">Add extras</legend>
            <div className="space-y-2">
              {item.addons.map((a) => (
                <label key={a.id} className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-border bg-surface px-4">
                  <span className="flex items-center gap-3">
                    <input type="checkbox" checked={addonIds.includes(a.id)} onChange={(e) => setAddonIds((l) => (e.target.checked ? [...l, a.id] : l.filter((x) => x !== a.id)))} className="h-5 w-5 accent-[var(--brand)]" />
                    {a.name}
                  </span>
                  <span className="tabular-nums text-muted">+{formatPrice(a.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="mt-5 block text-sm font-medium">
          Note for the kitchen (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Less spicy, no onion…" className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-brand" />
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2" role="group" aria-label="Quantity">
          <button className={stepper} aria-label="One less" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <m.span key={qty} initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={spring} className="w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite">{qty}</m.span>
          <button className={stepper} aria-label="One more" disabled={qty >= 20} onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
        </div>
        <button onClick={add} className="min-h-12 flex-1 rounded-full bg-brand px-5 text-base font-semibold text-brand-foreground transition active:scale-95">
          Add to order · {formatPrice(unit * qty)}
        </button>
      </div>
    </SheetFrame>
  );
}

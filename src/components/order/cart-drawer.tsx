"use client";
import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/t/[code]/actions";
import { cart, useCart, type CartLine } from "@/lib/cart";
import { deliveryFee, type DeliveryRules } from "@/lib/delivery";
import { quoteDelivery, type Quote } from "@/lib/delivery-actions";
import { formatPrice } from "@/lib/format";
import { spring } from "@/lib/motion/tokens";
import { SheetFrame } from "./item-sheet";

type Guest = { name: string; phone: string };
type Kind = "dine_in" | "takeaway" | "delivery";
type Ok = Extract<Quote, { ok: true }>;

const NL = String.fromCharCode(10);

/** Backup channel if the ordering system is ever down: the same order as a ready-to-send WhatsApp message. */
function whatsappLink(number: string, lines: CartLine[], total: number, where: string, name: string) {
  const body = lines.map((l) => `${l.qty} × ${l.name}${l.variantName ? ` (${l.variantName})` : ""}${l.addonNames.length ? ` + ${l.addonNames.join(", ")}` : ""}`).join(NL);
  const who = name.trim() ? `${NL}Name: ${name.trim()}` : "";
  const text = `Hi Platter, I'd like to order (${where}):${NL}${body}${NL}Total about ${formatPrice(total)}${who}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function TrashIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  );
}

function loadGuest(): Guest {
  try {
    return { name: "", phone: "", ...JSON.parse(localStorage.getItem("platter.guest") ?? "{}") };
  } catch {
    return { name: "", phone: "" };
  }
}

const KIND_LABEL: Record<Kind, string> = { dine_in: "Dine in", takeaway: "Takeaway", delivery: "Delivery" };

export function CartDrawer({ code, tableLabel, onNotAtTable, gstPercent, whatsapp, delivery, deliveryEnabled, prefill, closed = null, onClose }: {
  code: string | null; tableLabel: string | null; gstPercent: number; whatsapp: string;
  /** Website only: forget the remembered table so the guest can pick takeaway or delivery. */
  onNotAtTable?: () => void;
  delivery: DeliveryRules; deliveryEnabled: boolean; prefill: Guest | null; closed?: string | null; onClose: () => void;
}) {
  const router = useRouter();
  const { lines, note, subtotal, count } = useCart();
  // Scanned a table QR: dine in at that table, nothing to choose. From the website: dine in, takeaway or delivery.
  const kinds: Kind[] = code ? ["dine_in"] : deliveryEnabled ? ["dine_in", "takeaway", "delivery"] : ["dine_in", "takeaway"];
  const [kind, setKind] = useState<Kind>(code ? "dine_in" : "takeaway");
  const [guest, setGuest] = useState<Guest>(() => prefill ?? loadGuest());
  const [tableHint, setTableHint] = useState("");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState<Ok | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const tax = Math.round(subtotal * gstPercent) / 100;
  const fee = kind === "delivery" && quote ? deliveryFee(quote.km, subtotal, delivery) : 0;
  const total = subtotal + tax + fee;
  const belowMin = kind === "delivery" && delivery.min_order > subtotal;
  const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-brand";
  const stepper = "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-lg transition active:scale-90";

  async function check(from?: { lat: number; lng: number }) {
    setQuoteError("");
    setQuote(null);
    setQuoting(true);
    const res = await quoteDelivery({ address: address || undefined, lat: from?.lat, lng: from?.lng, subtotal });
    setQuoting(false);
    if (!res.ok) return setQuoteError(res.error);
    if (res.tooFar) return setQuoteError(`We deliver up to ${delivery.max_km} km. You are about ${res.km} km away.`);
    setQuote(res);
    if (!address.trim() && res.label) setAddress(res.label);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setQuoteError("Your browser cannot share your location. Type your address instead.");
    setQuoting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => check({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setQuoting(false);
        setQuoteError("We could not get your location. Allow location access, or type your address.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function submit() {
    setError("");
    if (!guest.name.trim() || guest.phone.replace(/\D/g, "").length < 10) return setError("Add your name and a 10-digit phone number so we can reach you.");
    if (kind === "dine_in" && !code && !tableHint.trim()) return setError("Tell us your table number.");
    if (kind === "delivery") {
      if (address.trim().length < 10) return setError("Add your full delivery address.");
      if (!quote) return setError("Tap Check delivery fee first, so we know the distance.");
      if (belowMin) return setError(`The minimum order for delivery is ${formatPrice(delivery.min_order)}.`);
    }
    start(async () => {
      const res = await placeOrder({
        code,
        orderType: kind,
        name: guest.name,
        phone: guest.phone.replace(/[\s-]/g, ""),
        note,
        key: cart.requestKey(),
        tableHint: kind === "dine_in" && !code ? tableHint : undefined,
        deliveryAddress: kind === "delivery" ? address : undefined,
        deliveryKm: kind === "delivery" ? quote?.km : undefined,
        deliveryLat: kind === "delivery" ? quote?.lat : undefined,
        deliveryLng: kind === "delivery" ? quote?.lng : undefined,
        lines: lines.map((l) => ({ item_id: l.itemId, variant_id: l.variantId, addon_ids: l.addonIds, qty: l.qty, note: l.note })),
      });
      if (!res.ok) return setError(res.error);
      try {
        localStorage.setItem("platter.guest", JSON.stringify(guest));
        localStorage.setItem("platter.lastOrder", JSON.stringify({ id: res.id, at: Date.now() }));
      } catch {
        /* storage blocked: the tracking page still opens */
      }
      navigator.vibrate?.([20, 40, 20]);
      cart.clear();
      router.push(`/order/${res.id}`);
    });
  }

  const where = code ? `dine in at ${tableLabel}` : kind === "dine_in" ? `dine in, table ${tableHint || "?"}` : kind === "delivery" ? "delivery" : "takeaway";

  return (
    <SheetFrame label="Your order" onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <h2 className="display text-3xl">Your order</h2>
        {lines.length > 0 && <p className="text-sm text-muted">{count} {count === 1 ? "item" : "items"} · {code ? tableLabel : KIND_LABEL[kind]}</p>}

        {lines.length === 0 ? (
          <p className="py-12 text-center text-muted">Your order is empty. Add something from the menu.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-border">
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <m.li key={l.key} layout="position" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={spring} className="overflow-hidden">
                    <div className="flex items-center gap-3 py-3">
                      <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${l.isVeg ? "bg-veg" : "bg-nonveg"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{l.name}</p>
                        {(l.variantName || l.addonNames.length > 0) && <p className="text-xs text-muted">{[l.variantName, ...l.addonNames].filter(Boolean).join(" · ")}</p>}
                        {l.note && <p className="text-xs italic text-muted">“{l.note}”</p>}
                        <p className="text-sm tabular-nums text-muted">{formatPrice(l.unitPrice)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5" role="group" aria-label={`Quantity of ${l.name}`}>
                        <button className={stepper} aria-label={l.qty === 1 ? `Remove ${l.name}` : "One less"} onClick={() => cart.setQty(l.key, l.qty - 1)}>{l.qty === 1 ? <TrashIcon /> : "−"}</button>
                        <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{l.qty}</span>
                        <button className={stepper} aria-label="One more" disabled={l.qty >= 20} onClick={() => cart.setQty(l.key, l.qty + 1)}>+</button>
                      </div>
                    </div>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>

            <label className="mt-3 block text-sm font-medium">
              Note for the whole order (optional)
              <textarea value={note} onChange={(e) => cart.setNote(e.target.value)} maxLength={300} rows={2} placeholder="Allergies, serve together…" className={`${field} py-2`} />
            </label>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium">How would you like it?</legend>
              {code ? (
                <>
                  <p className="flex min-h-12 items-center justify-center rounded-xl border border-espresso bg-espresso px-3 text-center text-sm font-semibold text-[#fbf6ef]">Dine in · {tableLabel}</p>
                  {onNotAtTable && (
                    <button type="button" onClick={() => { setKind("takeaway"); setError(""); onNotAtTable(); }} className="mt-1 flex min-h-11 w-full items-center justify-center text-sm font-medium text-brand underline-offset-4 hover:underline">
                      Not at the table? Order takeaway{deliveryEnabled ? " or delivery" : ""}
                    </button>
                  )}
                </>
              ) : (
                <div className={`grid gap-2 ${kinds.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {kinds.map((k) => (
                    <label key={k} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-medium transition ${kind === k ? "border-espresso bg-espresso text-[#fbf6ef]" : "border-border bg-surface"}`}>
                      <input type="radio" name="type" className="sr-only" checked={kind === k} onChange={() => { setKind(k); setError(""); }} />
                      {KIND_LABEL[k]}
                    </label>
                  ))}
                </div>
              )}
              {!code && kind === "dine_in" && (
                <label className="mt-3 block text-sm font-medium">
                  Your table number
                  <input value={tableHint} onChange={(e) => setTableHint(e.target.value)} maxLength={20} inputMode="numeric" placeholder="For example 7" className={field} />
                  <span className="mt-1 block text-xs font-normal text-muted">Tip: scanning the QR code on your table fills this in for you.</span>
                </label>
              )}
            </fieldset>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Name
                <input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} autoComplete="name" maxLength={60} className={field} />
              </label>
              <label className="block text-sm font-medium">
                Phone
                <input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" maxLength={16} className={field} />
              </label>
            </div>

            {kind === "delivery" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface p-4">
                <label className="block text-sm font-medium">
                  Delivery address
                  <textarea value={address} onChange={(e) => { setAddress(e.target.value); setQuote(null); }} rows={3} maxLength={300} autoComplete="street-address" placeholder="House or flat, street, area, landmark" className={`${field} py-2`} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={quoting} onClick={useMyLocation} className="min-h-11 rounded-full border border-border px-4 text-sm font-medium transition active:scale-95 disabled:opacity-60">Use my location</button>
                  <button type="button" disabled={quoting || address.trim().length < 6} onClick={() => check()} className="min-h-11 rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition active:scale-95 disabled:opacity-50">{quoting ? "Checking…" : "Check delivery fee"}</button>
                </div>
                {quoteError && <p role="alert" className="text-sm text-nonveg">{quoteError}</p>}
                {quote && (
                  <p role="status" className="rounded-lg bg-veg/10 p-3 text-sm">
                    About <strong>{quote.km} km</strong> from us. Delivery <strong>{fee === 0 ? "free" : formatPrice(fee)}</strong>.
                  </p>
                )}
                <p className="text-xs text-muted">Delivery costs {formatPrice(delivery.base_fare)} for the first {delivery.base_km} km, then {formatPrice(delivery.per_km)} per km, up to {delivery.max_km} km{delivery.free_above > 0 ? `. Free above ${formatPrice(delivery.free_above)}` : ""}. Some dishes, like breakfast, are not delivered.</p>
                {belowMin && <p role="alert" className="text-sm text-nonveg">The minimum order for delivery is {formatPrice(delivery.min_order)}.</p>}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-border bg-surface p-4 text-sm shadow-card">
              <p className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{formatPrice(subtotal)}</span></p>
              <p className="mt-1 flex justify-between"><span className="text-muted">GST {gstPercent}%</span><span className="tabular-nums">{formatPrice(tax)}</span></p>
              {kind === "delivery" && <p className="mt-1 flex justify-between"><span className="text-muted">Delivery</span><span className="tabular-nums">{quote ? (fee === 0 ? "Free" : formatPrice(fee)) : "Check fee"}</span></p>}
              <p className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatPrice(total)}</span></p>
              <p className="mt-2 text-xs text-muted">{kind === "delivery" ? "Pay the delivery person in cash or UPI when it arrives." : "Pay at the counter when you are done."} The final bill is confirmed by the cafe.</p>
            </div>
          </>
        )}
      </div>

      {lines.length > 0 && (
        <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && <p role="alert" className="mb-2 text-sm text-nonveg">{error}</p>}
          {closed && <p role="status" className="mb-2 text-center text-sm font-medium text-nonveg">{closed}</p>}
          <button onClick={submit} disabled={pending || Boolean(closed)} className="min-h-12 w-full rounded-full bg-brand text-base font-semibold text-brand-foreground transition active:scale-95 disabled:opacity-60">
            {pending ? "Placing your order…" : `Place order · ${count} ${count === 1 ? "item" : "items"} · ${formatPrice(total)}`}
          </button>
          <a href={whatsappLink(whatsapp, lines, total, where, guest.name)} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center justify-center text-sm font-medium text-muted underline">
            Or order on WhatsApp instead
          </a>
        </div>
      )}
    </SheetFrame>
  );
}

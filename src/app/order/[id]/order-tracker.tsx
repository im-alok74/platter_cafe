"use client";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cup } from "@/components/fx/fx";
import { Wordmark } from "@/components/wordmark";
import { formatPrice } from "@/lib/format";
import { duration, ease, spring } from "@/lib/motion/tokens";
import { orderTypeLabel, stepsFor, type TrackedOrder } from "@/lib/order";
import { createClient } from "@/lib/supabase/browser";

// Poll quickly right after a status change, then ease off: an order sits in each stage for minutes, so most polls would find nothing new.
const POLL_FAST = 4000;
const POLL_SLOW = 12_000;
const POLL_HIDDEN = 30_000;

/** A short burst when the food is ready. Skipped for people who prefer reduced motion. */
function Celebration() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        return (
          <m.span
            key={i}
            className={`absolute h-2 w-2 rounded-full ${["bg-brand", "bg-info", "bg-veg", "bg-taupe"][i % 4]}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 90, y: Math.sin(angle) * 70 - 20, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: ease.out }}
          />
        );
      })}
    </div>
  );
}

/** A small scene that changes with the order: steaming cup while it is made, a ringing bell when ready, a check when served. */
function StatusArt({ status }: { status: string }) {
  if (status === "ready")
    return (
      <svg aria-hidden viewBox="0 0 64 64" className="bell-ring mx-auto h-20 w-20 text-gold">
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 8a4 4 0 0 1 4 4v2c9 2 14 9 14 18v8l5 7H9l5-7v-8c0-9 5-16 14-18v-2a4 4 0 0 1 4-4Z" />
          <path d="M26 54a6 6 0 0 0 12 0" />
        </g>
      </svg>
    );
  if (status === "served")
    return (
      <svg aria-hidden viewBox="0 0 64 64" className="pop-in mx-auto h-20 w-20 text-gold">
        <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="26" />
          <path d="M20 33l8 8 17-18" />
        </g>
      </svg>
    );
  if (status === "cancelled") return null;
  return <Cup className="mx-auto h-24 w-28" />;
}

export function OrderTracker({ id }: { id: string }) {
  const [order, setOrder] = useState<TrackedOrder | null | undefined>(undefined); // undefined = loading, null = not found
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState("");
  const [burst, setBurst] = useState(0);
  const last = useRef<string | null>(null);
  const changedAt = useRef(0); // set on the first answer, never during render
  const supabase = useRef(createClient());

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.current.rpc("track_order", { p_id: id });
      if (error) throw error;
      setOffline(false);
      const next = (data as TrackedOrder | null) ?? null;
      if (next && last.current && last.current !== next.status) {
        navigator.vibrate?.(next.status === "ready" ? [30, 60, 30] : 15);
        if (next.status === "ready") setBurst((b) => b + 1);
      }
      if (next && last.current !== next.status) changedAt.current = Date.now(); // first answer counts as a change
      last.current = next?.status ?? last.current;
      setOrder(next);
      return next?.status;
    } catch {
      setOffline(true);
      return undefined;
    }
  }, [id]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      const status = await refresh();
      if (stopped || status === "served" || status === "cancelled") return;
      timer = setTimeout(loop, document.hidden ? POLL_HIDDEN : Date.now() - changedAt.current < 60_000 ? POLL_FAST : POLL_SLOW);
    };
    loop();
    const wake = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function ask(kind: "waiter" | "bill") {
    if (!order?.bench_code) return;
    const { error } = await supabase.current.rpc("request_service", { p_code: order.bench_code, p_kind: kind });
    setToast(error ? "Could not send that. Please wave to the staff." : kind === "waiter" ? "A waiter is on the way." : "The bill is being prepared.");
  }

  const shell = "mx-auto w-full max-w-md px-4 pb-16 pt-6";

  if (order === undefined)
    return (
      <main className={shell} aria-busy="true">
        <div className="h-72 animate-pulse rounded-2xl bg-border" />
        {offline && <p role="alert" className="mt-4 text-center text-sm text-muted">Waiting for a connection…</p>}
      </main>
    );

  if (order === null)
    return (
      <main className={`${shell} text-center`}>
        <h1 className="font-display text-3xl">We can&apos;t find that order</h1>
        <p className="mt-2 text-muted">Check the link, or ask the staff.</p>
        <Link href="/menu" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground">See the menu</Link>
      </main>
    );

  const cancelled = order.status === "cancelled";
  const steps = stepsFor(order.order_type);
  const current = steps.findIndex((s) => s.status === order.status);
  const headline = cancelled ? "Order cancelled" : order.status === "ready" ? (order.order_type === "delivery" ? "Your order is on its way!" : "Your order is ready!") : order.status === "served" ? "Enjoy your meal" : order.status === "preparing" ? "We're preparing your order" : "Order received";

  return (
    <main className={shell}>
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Platter home" className="text-3xl leading-none"><Wordmark /></Link>
        <p className="text-sm text-muted">{order.order_type === "dine_in" ? (order.bench_label ?? "Dine in") : orderTypeLabel[order.order_type]}</p>
      </div>

      {order.delivery_address && <p className="mt-3 rounded-xl bg-surface p-3 text-sm shadow-card"><span className="font-medium">Delivering to</span><br />{order.delivery_address}</p>}
      {offline && <p role="alert" className="mt-3 rounded-xl bg-nonveg/10 p-3 text-center text-sm text-nonveg">No connection. Showing your last update, retrying…</p>}

      <section className="relative mt-6 overflow-hidden rounded-3xl bg-espresso p-6 text-center text-[#fbf6ef] shadow-card">
        {burst > 0 && <Celebration key={burst} />}
        <StatusArt status={order.status} />
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Order number</p>
        <p className="display text-6xl tabular-nums">#{order.order_no}</p>
        <h1 className="mt-2 text-lg font-semibold" aria-live="polite">{headline}</h1>
        {!cancelled && (order.status === "received" || order.status === "preparing") && (
          <p className="mt-1 text-sm text-[#d9cbbd]">About {order.eta_minutes} min</p>
        )}
        {cancelled && <p className="mt-1 text-sm text-[#d9cbbd]">Please speak to the staff if this is a surprise.</p>}
        {!cancelled && (
          <div className="mx-auto mt-5 flex max-w-xs gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.status} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= current || order.status === "served" ? "bg-gold" : "bg-white/15"}`} />
            ))}
          </div>
        )}
      </section>

      {!cancelled && (
        <ol className="mt-6 space-y-0 rounded-2xl border border-border bg-surface p-4" aria-label="Order progress">
          {steps.map((s, i) => {
            const done = i < current || order.status === "served";
            const active = i === current && order.status !== "served";
            return (
              <li key={s.status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={active ? "step" : undefined}>
                {i < steps.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 overflow-hidden bg-border" aria-hidden>
                    <m.span className="block h-full w-full origin-top bg-brand" initial={false} animate={{ scaleY: done ? 1 : 0 }} transition={{ duration: duration.slow, ease: ease.inOut }} />
                  </span>
                )}
                <m.span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${done ? "border-brand bg-brand text-brand-foreground" : active ? "border-brand bg-background text-brand" : "border-border bg-background text-muted"}`}
                  animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={active ? { repeat: Infinity, duration: 1.8 } : spring}
                >
                  {done ? "✓" : i + 1}
                </m.span>
                <div className={done || active ? "" : "opacity-50"}>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-sm text-muted">{s.hint}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
        <h2 className="display text-lg">Your items</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>
                {it.qty} × {it.name}
                {(it.variant_name || it.addons.length > 0) && <span className="block text-xs text-muted">{[it.variant_name, ...it.addons.map((a) => a.name)].filter(Boolean).join(" · ")}</span>}
                {it.note && <span className="block text-xs italic text-muted">“{it.note}”</span>}
              </span>
              <span className="tabular-nums">{formatPrice((it.unit_price + it.addons.reduce((n, a) => n + a.price, 0)) * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <p className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{formatPrice(order.subtotal)}</span></p>
          {order.discount > 0 && <p className="flex justify-between"><span className="text-muted">Discount</span><span className="tabular-nums">−{formatPrice(order.discount)}</span></p>}
          {order.delivery_charge > 0 && <p className="flex justify-between"><span className="text-muted">Delivery{order.delivery_km ? ` (${order.delivery_km} km)` : ""}</span><span className="tabular-nums">{formatPrice(order.delivery_charge)}</span></p>}
          <p className="flex justify-between"><span className="text-muted">GST</span><span className="tabular-nums">{formatPrice(order.tax)}</span></p>
          <p className="flex justify-between text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatPrice(order.total)}</span></p>
          <p className="text-xs text-muted">{order.payment_status === "paid" ? "Paid. Thank you!" : order.payment_method === "counter" ? "Pay at the counter." : "Payment pending."}</p>
        </div>
      </section>

      {order.bench_code && !cancelled && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {order.status !== "served" ? (
            <button onClick={() => ask("waiter")} className="min-h-12 rounded-full border border-border bg-surface text-sm font-medium transition active:scale-95">Call a waiter</button>
          ) : (
            <Link href={`/t/${order.bench_code}`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface text-sm font-medium transition active:scale-95">Order more</Link>
          )}
          <button onClick={() => ask("bill")} className="min-h-12 rounded-full bg-brand text-sm font-semibold text-brand-foreground transition active:scale-95">Request the bill</button>
        </div>
      )}
      {order.bench_code && !cancelled && order.status !== "served" && (
        <Link href={`/t/${order.bench_code}`} className="mt-3 flex min-h-11 items-center justify-center text-sm font-medium text-brand">Order something else</Link>
      )}

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <AnimatePresence>
          {toast && <m.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-card">{toast}</m.p>}
        </AnimatePresence>
      </div>
    </main>
  );
}

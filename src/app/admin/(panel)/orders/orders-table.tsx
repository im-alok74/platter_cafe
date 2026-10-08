"use client";
import { useState } from "react";
import { card } from "@/components/admin/ui";
import { formatMoney } from "@/lib/format";
import { orderTypeLabel, type OrderStatus } from "@/lib/order";

export type FullOrder = {
  id: string; order_no: number; order_type: "dine_in" | "takeaway" | "delivery"; status: OrderStatus; payment_status: string; payment_method: string;
  total: number | string; placed_at: string; guest_name: string | null; guest_phone: string | null; table_hint: string | null; delivery_km: number | null;
  delivery_address: string | null; note: string | null; benches: { label: string } | null;
  items: { name: string; qty: number; variant_name: string | null; unit_price: number | string }[];
};

const chip: Record<OrderStatus, string> = { received: "bg-brand/15 text-brand", preparing: "bg-gold/25 text-[#7a5a1c]", ready: "bg-veg/15 text-veg", served: "bg-border text-muted", cancelled: "bg-nonveg/10 text-nonveg" };
const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const count = (o: FullOrder) => o.items.reduce((n, i) => n + i.qty, 0);
const place = (o: FullOrder) => (o.order_type === "dine_in" ? (o.benches?.label ?? (o.table_hint ? `Table ${o.table_hint}` : "Dine in")) : o.order_type === "delivery" ? `Delivery${o.delivery_km ? ` · ${o.delivery_km} km` : ""}` : orderTypeLabel[o.order_type]);

/** One page of orders, already filtered by the server. Only the open/close of a row is client state. */
export function OrdersTable({ orders }: { orders: FullOrder[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
      <ul className={`${card} mt-2 divide-y divide-border !p-0`}>
        {orders.length === 0 && <li className="p-8 text-center text-muted">No orders match.</li>}
        {orders.map((o) => {
          const isOpen = open === o.id;
          return (
            <li key={o.id}>
              <button onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left text-sm">
                <span className="w-12 font-semibold tabular-nums">#{o.order_no}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{place(o)}{o.guest_name ? ` · ${o.guest_name}` : ""}</span>
                  <span className="block text-xs text-muted">{when.format(new Date(o.placed_at))} · {count(o)} {count(o) === 1 ? "item" : "items"}</span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(Number(o.total))}</span>
                <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold capitalize sm:inline ${chip[o.status]}`}>{o.status}</span>
                <span aria-hidden className={`text-muted transition ${isOpen ? "rotate-90" : ""}`}>›</span>
              </button>
              {isOpen && (
                <div className="space-y-3 bg-background px-4 pb-4 pt-3 text-sm">
                  <p className="sm:hidden"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${chip[o.status]}`}>{o.status}</span></p>
                  <ul className="space-y-1">
                    {o.items.map((i, k) => (
                      <li key={k} className="flex justify-between gap-3">
                        <span><b className="tabular-nums">{i.qty} ×</b> {i.name}{i.variant_name ? ` (${i.variant_name})` : ""}</span>
                        <span className="tabular-nums text-muted">{formatMoney(i.qty * Number(i.unit_price))}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="grid gap-x-6 gap-y-1 border-t border-border pt-3 sm:grid-cols-2">
                    <div className="flex justify-between sm:block"><dt className="text-muted">Payment</dt><dd>{o.payment_status === "paid" ? "Paid" : o.payment_method === "counter" ? "Pays at the counter" : "Online, pending"}</dd></div>
                    {o.guest_phone && <div className="flex justify-between sm:block"><dt className="text-muted">Phone</dt><dd><a className="text-brand underline" href={`tel:${o.guest_phone}`}>{o.guest_phone}</a></dd></div>}
                    {o.delivery_address && <div className="sm:col-span-2"><dt className="text-muted">Deliver to</dt><dd>{o.delivery_address}{o.delivery_km ? ` (${o.delivery_km} km)` : ""}</dd></div>}
                    {o.note && <div className="sm:col-span-2"><dt className="text-muted">Note</dt><dd>{o.note}</dd></div>}
                  </dl>
                </div>
              )}
            </li>
          );
        })}
      </ul>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, card } from "@/components/admin/ui";
import { cart } from "@/lib/cart";
import { buildReorderLines, type CatalogItem } from "@/lib/reorder";
import { useSavedBench } from "@/lib/bench";
import { cartUi } from "@/lib/cart-ui";
import { formatPrice } from "@/lib/format";
import { orderTypeLabel, type OrderStatus } from "@/lib/order";

export type HistoryOrder = {
  id: string; order_no: number; status: OrderStatus; total: number; placed_at: string; order_type: "dine_in" | "takeaway" | "delivery";
  bench: { code: string; label: string } | null;
  items: { item_id: string | null; name: string; variant_name: string | null; qty: number; addons: { id: string; name: string }[] }[];
};

const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const chip: Record<OrderStatus, string> = { received: "bg-info/10 text-info", preparing: "bg-info/10 text-info", ready: "bg-veg/10 text-veg", served: "bg-border text-muted", cancelled: "bg-nonveg/10 text-nonveg" };

export function OrderList({ orders, catalog }: { orders: HistoryOrder[]; catalog: Record<string, CatalogItem> }) {
  const router = useRouter();
  const bench = useSavedBench();
  const [notice, setNotice] = useState<{ id: string; text: string; go?: string } | null>(null);

  /** Rebuilds the order from today's menu. Anything sold out or removed is skipped, and we say so. */
  function reorder(o: HistoryOrder) {
    const { lines, skipped, added } = buildReorderLines(o.items, catalog);
    lines.forEach((l) => cart.add(l));
    navigator.vibrate?.(12);
    // Only send them to a table menu if they are at that table right now; otherwise the cart is ready on the website.
    const target = bench?.code;
    const text = added === 0 ? "None of those items are available right now." : `Added ${added} ${added === 1 ? "item" : "items"} to your order.${skipped.length ? ` Not available today: ${skipped.join(", ")}.` : ""}`;
    setNotice({ id: o.id, text, go: added && target ? `/t/${target}` : undefined });
    if (added && skipped.length === 0) {
      if (target) router.push(`/t/${target}`);
      else cartUi.openDrawer();
    }
  }

  if (orders.length === 0)
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl">No orders yet</p>
        <p className="mt-1 text-muted">Orders you place while signed in show up here.</p>
        <Link href="/menu" className={`${btn.primary} mt-4`}>See the menu</Link>
      </div>
    );

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Order #{o.order_no}</p>
              <p className="text-sm text-muted">{when.format(new Date(o.placed_at))} · {o.bench?.label ?? orderTypeLabel[o.order_type]}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${chip[o.status]}`}>{o.status}</span>
          </div>
          <p className="mt-2 text-sm">{o.items.map((i) => `${i.qty} × ${i.name}${i.variant_name ? ` (${i.variant_name})` : ""}`).join(", ")}</p>
          <p className="mt-1 font-medium tabular-nums">{formatPrice(o.total)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => reorder(o)} className={btn.primary}>Order again</button>
            {o.status !== "served" && o.status !== "cancelled" && <Link href={`/order/${o.id}`} className={btn.ghost}>Track</Link>}
          </div>
          {notice?.id === o.id && (
            <p role="status" className="mt-3 rounded-xl bg-background p-3 text-sm">
              {notice.text}{" "}
              {notice.go ? <Link href={notice.go} className="font-semibold text-brand">Go to your table menu</Link> : notice.text.startsWith("Added") ? <button className="font-semibold text-brand" onClick={cartUi.openDrawer}>Open your order</button> : null}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

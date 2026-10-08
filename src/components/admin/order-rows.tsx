import { formatMoney } from "@/lib/format";
import { orderTypeLabel, type OrderStatus } from "@/lib/order";

export type OrderRow = {
  id: string; order_no: number; order_type: "dine_in" | "takeaway" | "delivery"; status: OrderStatus; total: number; placed_at: string;
  guest_name: string | null; table_hint: string | null; delivery_km: number | null; benches: { label: string } | null;
};

const chip: Record<OrderStatus, string> = { received: "bg-info/10 text-info", preparing: "bg-gold/20 text-[#7a5a1c]", ready: "bg-veg/10 text-veg", served: "bg-border text-muted", cancelled: "bg-nonveg/10 text-nonveg" };
const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const ORDER_COLS = "id,order_no,order_type,status,total,placed_at,guest_name,table_hint,delivery_km,benches(label)";

function where(o: OrderRow) {
  if (o.order_type === "dine_in") return o.benches?.label ?? (o.table_hint ? `Table ${o.table_hint}` : "Dine in");
  if (o.order_type === "delivery") return `Delivery${o.delivery_km ? ` · ${o.delivery_km} km` : ""}`;
  return orderTypeLabel[o.order_type];
}

export function OrderRows({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) return <p className="p-6 text-center text-muted">No orders in this period.</p>;
  return (
    <ul className="divide-y divide-border">
      {orders.map((o) => (
        <li key={o.id} className="flex items-center gap-3 px-4 py-3 text-sm">
          <span className="w-12 font-semibold tabular-nums">#{o.order_no}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{where(o)}{o.guest_name ? ` · ${o.guest_name}` : ""}</span>
            <span className="block text-xs text-muted">{time.format(new Date(o.placed_at))}</span>
          </span>
          <span className="font-medium tabular-nums">{formatMoney(Number(o.total))}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${chip[o.status]}`}>{o.status}</span>
        </li>
      ))}
    </ul>
  );
}

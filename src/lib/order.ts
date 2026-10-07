export type OrderStatus = "received" | "preparing" | "ready" | "served" | "cancelled";

export type TrackedOrder = {
  id: string;
  order_no: number;
  status: OrderStatus;
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  payment_method: "online" | "counter";
  order_type: "dine_in" | "takeaway" | "delivery";
  bench_label: string | null;
  bench_code: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  delivery_charge: number;
  total: number;
  delivery_address: string | null;
  delivery_km: number | null;
  note: string | null;
  placed_at: string;
  eta_minutes: number;
  items: { name: string; variant_name: string | null; qty: number; unit_price: number; addons: { name: string; price: number }[]; note: string | null }[];
};

export const STEPS: { status: Exclude<OrderStatus, "cancelled">; label: string; hint: string }[] = [
  { status: "received", label: "Order received", hint: "The kitchen has your order" },
  { status: "preparing", label: "Preparing", hint: "Your food is being made" },
  { status: "ready", label: "Ready", hint: "On its way to your table" },
  { status: "served", label: "Served", hint: "Enjoy your meal" },
];

export const orderTypeLabel = { dine_in: "Dine in", takeaway: "Takeaway", delivery: "Delivery" } as const;

/** The progress steps, worded for how the order is being served. */
export function stepsFor(type: "dine_in" | "takeaway" | "delivery") {
  if (type === "takeaway") return STEPS.map((s) => (s.status === "ready" ? { ...s, hint: "Ready for pickup at the counter" } : s.status === "served" ? { ...s, label: "Picked up", hint: "Enjoy your meal" } : s));
  if (type === "delivery") return STEPS.map((s) => (s.status === "ready" ? { ...s, label: "Out for delivery", hint: "On its way to you" } : s.status === "served" ? { ...s, label: "Delivered", hint: "Enjoy your meal" } : s));
  return STEPS;
}

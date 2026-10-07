import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderRow } from "@/components/admin/order-rows";

const shortDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export type Delta = { pct: number | null; up: boolean };
export type Dashboard = {
  days: number;
  sales: number; orders: number; avg: number; cancelled: number; open: number;
  salesDelta: Delta; ordersDelta: Delta; avgDelta: Delta;
  repeatPct: number | null; customers: number; avgReadyMin: number | null;
  daily: { label: string; sales: number; orders: number }[];
  hours: { hour: number; orders: number }[];
  types: { label: string; value: number }[];
  topDishes: { name: string; qty: number; revenue: number }[];
  sections: { name: string; revenue: number }[];
  pipeline: { received: number; preparing: number; ready: number };
  menu: { items: number; soldOut: number; hidden: number; noPhoto: number };
  tables: number;
  requests: number;
  recent: OrderRow[];
};

/** What public.dashboard_summary returns. Money comes back as numbers or numeric strings, so everything is coerced below. */
type Raw = {
  days: number; sales: number | string; orders: number; prevSales: number | string; prevOrders: number; cancelled: number;
  daily: { day: string; sales: number; orders: number }[]; hours: number[];
  types: { dine_in: number; takeaway: number; delivery: number };
  topDishes: { name: string; qty: number; revenue: number | string }[]; sections: { name: string; revenue: number | string }[];
  customers: { total: number; repeat: number }; avgReadyMin: number | null;
  pipeline: Dashboard["pipeline"]; menu: Dashboard["menu"]; tables: number; requests: number; recent: OrderRow[];
};

const delta = (now: number, before: number): Delta => ({ pct: before > 0 ? Math.round(((now - before) / before) * 100) : null, up: now >= before });

/**
 * Everything the owner/manager dashboard shows, from ONE database call: public.dashboard_summary adds it all up in SQL
 * (it replaced ~10 queries and a 3,000-row pull). It runs as the signed-in staff member and checks their role itself,
 * so no service-role secret is involved. Cheap enough to run per load: it is one indexed range scan on orders.
 */
export async function getDashboard(db: SupabaseClient, cafeId: string, days: number): Promise<Dashboard> {
  const { data, error } = await db.rpc("dashboard_summary", { p_cafe: cafeId, p_days: days });
  if (error || !data) throw new Error("Could not load the dashboard.");
  const r = data as Raw;

  const sales = Number(r.sales), prevSales = Number(r.prevSales);
  const avg = r.orders ? sales / r.orders : 0, prevAvg = r.prevOrders ? prevSales / r.prevOrders : 0;
  const typeLabel = { dine_in: "Dine in", takeaway: "Takeaway", delivery: "Delivery" } as const;
  return {
    days: r.days,
    sales, orders: r.orders, avg, cancelled: r.cancelled,
    open: r.pipeline.received + r.pipeline.preparing + r.pipeline.ready,
    salesDelta: delta(sales, prevSales), ordersDelta: delta(r.orders, r.prevOrders), avgDelta: delta(avg, prevAvg),
    repeatPct: r.customers.total >= 3 ? Math.round((r.customers.repeat / r.customers.total) * 100) : null,
    customers: r.customers.total,
    avgReadyMin: r.avgReadyMin,
    daily: r.daily.map((d) => ({ label: shortDay.format(new Date(`${d.day}T00:00:00Z`)), sales: d.sales, orders: d.orders })),
    hours: r.hours.map((orders, hour) => ({ hour, orders })),
    types: (Object.keys(typeLabel) as (keyof typeof typeLabel)[]).map((k) => ({ label: typeLabel[k], value: r.types[k] })),
    topDishes: r.topDishes.map((d) => ({ name: d.name, qty: d.qty, revenue: Number(d.revenue) })),
    sections: r.sections.map((s) => ({ name: s.name, revenue: Number(s.revenue) })),
    pipeline: r.pipeline,
    menu: r.menu, tables: r.tables, requests: r.requests,
    recent: r.recent.map((o) => ({ ...o, total: Number(o.total) })),
  };
}

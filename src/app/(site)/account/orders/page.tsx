import { Pager } from "@/components/pager";
import { getMenu } from "@/lib/data/menu";
import { pageCount, pageOf } from "@/lib/paginate";
import type { CatalogItem } from "@/lib/reorder";
import { createClient } from "@/lib/supabase/server";
import { OrderList, type HistoryOrder } from "./order-list";

// Reads the signed-in session on every request, so this route cannot be an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Orders" };

const SIZE = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page, from, to } = pageOf((await searchParams).page, SIZE);
  // The menu is cached, so the only database request here is this page of orders (and the total, in the same request).
  const [{ data, error, count }, menu] = await Promise.all([
    (await createClient())
      .from("orders")
      .select("id,order_no,status,total,placed_at,order_type,bench:benches(code,label),items:order_items(item_id,name,variant_name,qty,addons)", { count: "exact" })
      .order("placed_at", { ascending: false })
      .range(from, to),
    getMenu(),
  ]);
  if (error) throw new Error("Could not load your orders.");
  const orders = (data as unknown as HistoryOrder[]).map((o) => ({ ...o, total: Number(o.total) }));

  // Only the dishes these orders used, not the whole menu, so the page payload stays small however big the menu grows.
  const used = new Set(orders.flatMap((o) => o.items.map((i) => i.item_id)));
  const catalog: Record<string, CatalogItem> = {};
  for (const c of menu)
    for (const i of c.items)
      if (used.has(i.id)) catalog[i.id] = { name: i.name, isVeg: i.is_veg, price: i.price, soldOut: i.sold_out, variants: i.variants.map((v) => ({ id: v.id, name: v.name, price: Number(v.price) })), addons: i.addons };

  return (
    <>
      <h1 className="mb-4 font-display text-3xl">Your orders</h1>
      <OrderList orders={orders} catalog={catalog} />
      <Pager page={page} pages={pageCount(count ?? orders.length, SIZE)} path="/account/orders" />
    </>
  );
}

import { assertStaff } from "@/lib/admin/auth";
import { istDayStart } from "@/lib/admin/range";
import { createClient } from "@/lib/supabase/server";

const RANGES: Record<string, [number, number | null]> = { today: [0, null], yesterday: [1, 0], week: [6, null], month: [29, null] };
const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

/** A spreadsheet cell. Anything that could be read as a formula is defused, because names and notes come from customers. */
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

type Row = {
  order_no: number; placed_at: string; order_type: string; status: string; payment_status: string; payment_method: string; total: number | string;
  guest_name: string | null; guest_phone: string | null; table_hint: string | null; delivery_address: string | null;
  benches: { label: string } | null; items: { name: string; qty: number; variant_name: string | null }[];
};

/** Orders for the chosen period as a CSV file, for accounts. Owner and manager only. */
export async function GET(request: Request) {
  try {
    await assertStaff();
  } catch {
    return new Response("Not allowed", { status: 403 });
  }
  const key = new URL(request.url).searchParams.get("range") ?? "today";
  const [from, to] = RANGES[key] ?? RANGES.today;
  const db = await createClient();
  let q = db
    .from("orders")
    .select("order_no,placed_at,order_type,status,payment_status,payment_method,total,guest_name,guest_phone,table_hint,delivery_address,benches(label),items:order_items(name,qty,variant_name)")
    .gte("placed_at", istDayStart(from))
    .order("placed_at", { ascending: false })
    .limit(5000);
  if (to !== null) q = q.lt("placed_at", istDayStart(to));
  const { data, error } = await q;
  if (error) return new Response("Could not load the orders", { status: 500 });

  const header = ["Order", "Date (IST)", "Type", "Table", "Customer", "Phone", "Status", "Payment", "Items", "Delivery address", "Total (INR)"];
  const lines = ((data ?? []) as unknown as Row[]).map((o) =>
    [
      o.order_no,
      when.format(new Date(o.placed_at)),
      o.order_type.replace("_", " "),
      o.benches?.label ?? (o.table_hint ? `Table ${o.table_hint}` : ""),
      o.guest_name,
      o.guest_phone,
      o.status,
      o.payment_status === "paid" ? "paid" : o.payment_method === "counter" ? "pay at counter" : "pending",
      o.items.map((i) => `${i.qty} x ${i.name}${i.variant_name ? ` (${i.variant_name})` : ""}`).join("; "),
      o.delivery_address,
      Number(o.total).toFixed(2),
    ].map(cell).join(","),
  );
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="platter-orders-${key}.csv"`, "Cache-Control": "no-store" },
  });
}

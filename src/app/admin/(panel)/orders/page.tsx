import Link from "next/link";
import { Pager } from "@/components/pager";
import { requireStaff } from "@/lib/admin/auth";
import { istDayStart } from "@/lib/admin/range";
import { pageCount, pageOf } from "@/lib/paginate";
import { createClient } from "@/lib/supabase/server";
import { OrdersTable, type FullOrder } from "./orders-table";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Orders" };

const SIZE = 25;
// label, days back for the start, days back for the end (null = now)
const RANGES = { today: ["Today", 0, null], yesterday: ["Yesterday", 1, 0], week: ["Last 7 days", 6, null], month: ["Last 30 days", 29, null] } as const;
const STATUSES = { all: "All", open: "Open", served: "Served", cancelled: "Cancelled" } as const;
const TYPES = { all: "All types", dine_in: "Dine in", takeaway: "Takeaway", delivery: "Delivery" } as const;
type Range = keyof typeof RANGES;
type Status = keyof typeof STATUSES;
type Type = keyof typeof TYPES;

const COLS =
  "id,order_no,order_type,status,payment_status,payment_method,total,placed_at,guest_name,guest_phone,table_hint,delivery_km,delivery_address,note,benches(label),items:order_items(name,qty,variant_name,unit_price)";

const pick = <T extends string>(v: string | undefined, allowed: Record<T, unknown>, fallback: T): T => (v && v in allowed ? (v as T) : fallback);
const pill = (on: boolean) => `inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition active:scale-95 ${on ? "border-espresso bg-espresso text-[#fbf6ef]" : "border-border bg-surface"}`;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ range?: string; status?: string; type?: string; q?: string; page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const range = pick<Range>(sp.range, RANGES, "today");
  const status = pick<Status>(sp.status, STATUSES, "all");
  const type = pick<Type>(sp.type, TYPES, "all");
  // Commas, brackets and wildcards are PostgREST filter syntax; a customer-style search never needs them.
  const q = (sp.q ?? "").trim().slice(0, 40).replace(/[,()*%\\"]/g, "");
  const { page, from, to: last } = pageOf(sp.page, SIZE);

  const [, back, until] = RANGES[range];
  const db = await createClient();
  // One request: this page of rows and the total count together.
  let query = db.from("orders").select(COLS, { count: "exact" }).gte("placed_at", istDayStart(back)).order("placed_at", { ascending: false }).range(from, last);
  if (until !== null) query = query.lt("placed_at", istDayStart(until));
  if (type !== "all") query = query.eq("order_type", type);
  if (status === "open") query = query.in("status", ["received", "preparing", "ready"]);
  else if (status !== "all") query = query.eq("status", status);
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (/^[\d\s+#-]+$/.test(q) && digits) query = query.or(digits.length <= 6 ? `order_no.eq.${digits},guest_phone.ilike.%${digits}%` : `guest_phone.ilike.%${digits}%`);
    else query = query.or(`guest_name.ilike.%${q}%,table_hint.ilike.%${q}%`);
  }
  const { data, error, count } = await query;
  if (error) throw new Error("Could not load the orders.");
  const total = count ?? 0;
  const pages = pageCount(total, SIZE);

  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ range, status, type, ...(q ? { q } : {}), ...over });
    for (const [k, v] of [...p]) if (v === "all" || (k === "range" && v === "today")) p.delete(k);
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-4xl md:text-5xl">Orders</h1>
        <a href={href({}).replace("/admin/orders", "/admin/orders/export")} className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold">Download CSV</a>
      </div>

      <form action="/admin/orders" className="mt-3 flex flex-wrap gap-2">
        {range !== "today" && <input type="hidden" name="range" value={range} />}
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        {type !== "all" && <input type="hidden" name="type" value={type} />}
        <input name="q" defaultValue={q} placeholder="Order #, name, phone or table" aria-label="Search orders by order number, name, phone or table" className="min-h-11 w-full rounded-full border border-border bg-surface px-4 text-base outline-none focus:border-brand md:w-96" />
        <button className="min-h-11 rounded-full bg-espresso px-5 text-sm font-semibold text-[#fbf6ef] transition active:scale-95">Search</button>
        {q && <Link href={href({ q: "" })} prefetch={false} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand">Clear</Link>}
      </form>

      <nav aria-label="Period" className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {(Object.keys(RANGES) as Range[]).map((r) => <Link key={r} href={href({ range: r })} prefetch={false} aria-current={r === range ? "page" : undefined} className={pill(r === range)}>{RANGES[r][0]}</Link>)}
      </nav>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Status">
        {(Object.keys(STATUSES) as Status[]).map((s) => <Link key={s} href={href({ status: s })} prefetch={false} aria-current={s === status ? "true" : undefined} className={pill(s === status)}>{STATUSES[s]}</Link>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Order type">
        {(Object.keys(TYPES) as Type[]).map((t) => <Link key={t} href={href({ type: t })} prefetch={false} aria-current={t === type ? "true" : undefined} className={pill(t === type)}>{TYPES[t]}</Link>)}
      </div>

      <p className="mt-3 text-sm text-muted" role="status">
        {total} {total === 1 ? "order" : "orders"}{total > SIZE ? ` · showing ${from + 1}–${Math.min(total, from + SIZE)}` : ""}
      </p>
      <OrdersTable key={`${range}${status}${type}${q}${page}`} orders={(data ?? []) as unknown as FullOrder[]} />
      <Pager page={page} pages={pages} path="/admin/orders" params={{ range: range === "today" ? undefined : range, status: status === "all" ? undefined : status, type: type === "all" ? undefined : type, q }} />
    </>
  );
}

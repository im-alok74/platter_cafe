import Link from "next/link";
import { DeltaBadge, Donut, HourChart, RankBars, TrendChart } from "@/components/admin/charts";
import { OrderRows } from "@/components/admin/order-rows";
import { card } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { getDashboard } from "@/lib/admin/analytics";
import { getSettings } from "@/lib/data/site";
import { istDayStart } from "@/lib/admin/range";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Dashboard" };

const RANGES = [7, 14, 30] as const;
const greeting = () => {
  const h = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

function Stat({ label, value, tone = "", children }: { label: string; value: string; tone?: string; children?: React.ReactNode }) {
  return (
    <li className={`${card} flex flex-col gap-1`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`display text-3xl tabular-nums ${tone}`}>{value}</p>
      <div className="min-h-4">{children}</div>
    </li>
  );
}

function Panel({ title, hint, className = "", flush = false, children }: { title: string; hint?: React.ReactNode; className?: string; flush?: boolean; children: React.ReactNode }) {
  return (
    <section className={`${card} ${flush ? "overflow-hidden !px-0 !pb-0" : ""} ${className}`}>
      <div className={`mb-3 flex items-baseline justify-between gap-3 ${flush ? "px-4" : ""}`}>
        <h2 className="display text-xl">{title}</h2>
        {hint && <p className="whitespace-nowrap text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Pipeline({ p, big = false }: { p: { received: number; preparing: number; ready: number }; big?: boolean }) {
  const cells = [
    ["New", p.received, "bg-brand text-brand-foreground"],
    ["Cooking", p.preparing, "bg-gold text-[#2a1d17]"],
    ["Ready", p.ready, "bg-veg text-white"],
  ] as const;
  return (
    <ul className={`grid grid-cols-3 gap-3 ${big ? "" : "sm:max-w-md"}`}>
      {cells.map(([l, n, c]) => (
        <li key={l} className={`rounded-2xl p-4 ${c}`}>
          <p className={`display tabular-nums ${big ? "text-6xl" : "text-4xl"}`}>{n}</p>
          <p className="text-sm font-semibold opacity-90">{l}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string; days?: string }> }) {
  const staff = await requireStaff(["owner", "manager", "kitchen"]);
  const sp = await searchParams;
  const days = RANGES.find((d) => String(d) === sp.days) ?? 7;
  const denied = sp.denied && <p role="alert" className="mb-4 rounded-xl bg-nonveg/10 p-3 text-sm text-nonveg">Your role does not have access to that page.</p>;
  const head = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-4xl md:text-5xl">{greeting()}</h1>
        <p className="mt-1 text-muted">{today.format(new Date())}</p>
      </div>
    </div>
  );

  // ---- Kitchen: a live queue and what to cook, no money.
  if (staff.role === "kitchen") {
    const db = await createClient();
    const open = ((await db.from("orders").select("id,status,items:order_items(name,qty)").in("status", ["received", "preparing", "ready"]).gte("placed_at", istDayStart(1))).data ?? []) as unknown as { id: string; status: string; items: { name: string; qty: number }[] }[];
    const pipeline = { received: open.filter((o) => o.status === "received").length, preparing: open.filter((o) => o.status === "preparing").length, ready: open.filter((o) => o.status === "ready").length };
    const toCook = new Map<string, number>();
    open.filter((o) => o.status !== "ready").forEach((o) => o.items.forEach((i) => toCook.set(i.name, (toCook.get(i.name) ?? 0) + i.qty)));
    const list = [...toCook.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    return (
      <>
        {denied}
        {head}
        <Pipeline p={pipeline} big />
        <Link href="/kitchen" className="mt-5 flex min-h-16 items-center justify-center rounded-2xl bg-espresso text-xl font-semibold text-[#fbf6ef] transition active:scale-[0.99]">Open the kitchen screen</Link>
        <Panel title="To cook now" hint="New and cooking orders, added up" className="mt-5">
          {list.length === 0 ? <p className="py-6 text-center text-muted">Nothing waiting. Enjoy the quiet.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map(([n, q]) => (
                <li key={n} className="flex items-center gap-3 rounded-xl bg-background px-4 py-3">
                  <span className="display text-3xl tabular-nums text-brand">{q}</span>
                  <span className="text-lg font-medium">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </>
    );
  }

  // ---- Owner and manager: the numbers.
  const [a, settings] = await Promise.all([getDashboard(await createClient(), staff.cafeId, days), getSettings()]);
  const openHour = Number(settings.hours.open.slice(0, 2));
  const closeHour = Math.ceil(Number(settings.hours.close.slice(0, 2)) + Number(settings.hours.close.slice(3, 5)) / 60) - 1;
  const { items, soldOut, hidden, noPhoto } = a.menu;
  const tables = a.tables;
  const recent = a.recent;
  const peak = a.hours.filter((h) => h.hour >= openHour && h.hour <= closeHour).reduce((x, y) => (y.orders > x.orders ? y : x), { hour: 0, orders: 0 });
  const hourName = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
  const noData = a.orders === 0;

  return (
    <>
      {denied}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl md:text-5xl">{greeting()}</h1>
          <p className="mt-1 text-muted">{today.format(new Date())}</p>
        </div>
        <nav aria-label="Period" className="flex gap-1.5">
          {RANGES.map((d) => (
            <Link key={d} href={`/admin?days=${d}`} prefetch={false} aria-current={d === days ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${d === days ? "border-espresso bg-espresso text-[#fbf6ef]" : "border-border bg-surface"}`}>
              {d} days
            </Link>
          ))}
        </nav>
      </div>

      <section aria-label="Right now" className={`${card} mb-4 flex flex-wrap items-center justify-between gap-4`}>
        <div className="min-w-40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">On the pass right now</p>
          <p className="display text-3xl tabular-nums">{a.open} open</p>
        </div>
        <div className="basis-full sm:basis-0 sm:flex-1"><Pipeline p={a.pipeline} /></div>
        <div className="flex flex-col gap-2 text-sm">
          {a.requests > 0 && <span className="rounded-full bg-info/10 px-3 py-1 font-semibold text-info">{a.requests} table {a.requests === 1 ? "request" : "requests"} waiting</span>}
          <Link href="/kitchen" className="font-semibold text-brand">Open kitchen →</Link>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={`Sales, ${days} days`} value={formatPrice(Math.round(a.sales))} tone="text-brand"><DeltaBadge {...a.salesDelta} /></Stat>
        <Stat label="Orders" value={String(a.orders)}><DeltaBadge {...a.ordersDelta} /></Stat>
        <Stat label="Average order" value={formatPrice(Math.round(a.avg))}><DeltaBadge {...a.avgDelta} /></Stat>
        <Stat label="Repeat customers" value={a.repeatPct === null ? "–" : `${a.repeatPct}%`} tone="text-info"><span className="text-xs text-muted">{a.repeatPct === null ? "Needs a few more orders" : `of ${a.customers} customers ordered again`}</span></Stat>
        <Stat label="Time to ready" value={a.avgReadyMin === null ? "–" : `${a.avgReadyMin} min`}><span className="text-xs text-muted">{a.cancelled ? `${a.cancelled} cancelled` : "from order to ready"}</span></Stat>
      </ul>

      {noData ? (
        <Panel title="No orders in this period yet" className="mt-4">
          <p className="py-8 text-center text-muted">The graphs fill in as orders come through. Try a longer period, or place a test order.</p>
        </Panel>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel title="Sales and orders" hint={`Last ${days} days`} className="lg:col-span-2"><TrendChart data={a.daily} /></Panel>
            <Panel title="Busiest hours" hint={peak.orders ? `Peak: ${hourName(peak.hour)}` : undefined}><HourChart data={a.hours} from={openHour} to={closeHour} /></Panel>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel title="How people order"><Donut parts={a.types} /></Panel>
            <Panel title="Top dishes" hint="By number sold"><RankBars rows={a.topDishes.map((d) => ({ label: d.name, value: d.qty, display: `${d.qty} sold` }))} /></Panel>
            <Panel title="Sales by menu section" hint="Revenue share"><RankBars tone="brand" rows={a.sections.map((s) => ({ label: s.name, value: s.revenue, display: `${Math.round((s.revenue / Math.max(1, a.sections.reduce((n, x) => n + x.revenue, 0))) * 100)}%` }))} /></Panel>
          </div>
        </>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Recent orders" hint={<Link href="/admin/orders" className="text-sm font-semibold text-brand">See all</Link>} flush className="lg:col-span-2">
          <OrderRows orders={recent} />
        </Panel>
        <Panel title="Your menu" hint={`${items} dishes · ${tables} tables`}>
          <ul className="space-y-2 text-sm">
            {[
              ["Sold out right now", soldOut, "/admin/menu?filter=sold_out", soldOut ? "text-nonveg" : ""],
              ["Hidden from customers", hidden, "/admin/menu?filter=hidden", ""],
              ["Dishes without a photo", noPhoto, "/admin/menu", noPhoto ? "text-info" : "text-veg"],
            ].map(([l, n, href, tone]) => (
              <li key={String(l)}>
                <Link href={String(href)} className="flex min-h-11 items-center justify-between rounded-xl bg-background px-3 transition active:scale-[0.99]">
                  <span>{l}</span>
                  <span className={`display text-2xl tabular-nums ${tone}`}>{n}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
            <Link href="/admin/menu/new" className="flex min-h-11 items-center justify-center rounded-full bg-brand text-brand-foreground">Add a dish</Link>
            <Link href="/admin/menu" className="flex min-h-11 items-center justify-center rounded-full border border-border bg-surface">Add photos</Link>
            <Link href="/admin/delivery" className="flex min-h-11 items-center justify-center rounded-full border border-border bg-surface">Delivery rates</Link>
            <Link href="/admin/tables" className="flex min-h-11 items-center justify-center rounded-full border border-border bg-surface">Print QR codes</Link>
          </div>
        </Panel>
      </div>
    </>
  );
}

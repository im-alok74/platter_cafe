"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { setSoldOut } from "./actions";
import { Wordmark } from "@/components/wordmark";
import { formatPrice } from "@/lib/format";
import { orderTypeLabel, type OrderStatus } from "@/lib/order";
import { createClient } from "@/lib/supabase/browser";

type KItem = { id: string; name: string; variant_name: string | null; qty: number; addons: { name: string }[]; note: string | null };
type KOrder = {
  id: string; order_no: number; status: OrderStatus; payment_status: string; payment_method: string; order_type: "dine_in" | "takeaway" | "delivery";
  note: string | null; guest_name: string | null; guest_phone: string | null; total: number; placed_at: string; bench: { label: string } | null; items: KItem[];
  table_hint: string | null; delivery_address: string | null; delivery_km: number | null; delivery_charge: number;
};
type Request = { id: string; kind: "waiter" | "bill"; created_at: string; bench: { label: string } | null };

const SELECT = "id,order_no,status,payment_status,payment_method,order_type,note,guest_name,guest_phone,total,placed_at,table_hint,delivery_address,delivery_km,delivery_charge,bench:benches(label),items:order_items(id,name,variant_name,qty,addons,note)";
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  received: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "served", label: "Mark served" },
};
const BACK: Partial<Record<OrderStatus, OrderStatus>> = { preparing: "received", ready: "preparing", served: "ready" };
const placeLabel = (o: KOrder) => o.bench?.label ?? (o.table_hint ? `Table ${o.table_hint}` : orderTypeLabel[o.order_type]);
const minutesAgo = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

function Kot({ o }: { o: KOrder }) {
  return (
    <div className="p-4 font-mono text-black">
      <p className="text-xl font-bold">KOT · #{o.order_no}</p>
      <p>{placeLabel(o)} · {orderTypeLabel[o.order_type]}</p>
      {o.delivery_address && <p>Deliver to: {o.delivery_address} ({o.delivery_km} km)</p>}
      {o.guest_name && <p>{o.guest_name} {o.guest_phone}</p>}
      <p>{new Date(o.placed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
      <hr className="my-2 border-black" />
      {o.items.map((i) => (
        <p key={i.id} className="text-lg">{i.qty} × {i.name}{i.variant_name ? ` (${i.variant_name})` : ""}{i.addons.length ? ` + ${i.addons.map((a) => a.name).join(", ")}` : ""}{i.note ? ` — ${i.note}` : ""}</p>
      ))}
      {o.note && <p className="mt-2 font-bold">Note: {o.note}</p>}
    </div>
  );
}

export function KitchenBoard({ actions, dishes }: { actions: ReactNode; dishes: { id: string; name: string; soldOut: boolean }[] }) {
  const sb = useRef(createClient());
  const [orders, setOrders] = useState<KOrder[] | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [live, setLive] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState<KOrder | null>(null);
  const [filter, setFilter] = useState<"all" | KOrder["order_type"]>("all");
  const [soldPanel, setSoldPanel] = useState(false);
  const [dishQ, setDishQ] = useState("");
  const [dishState, setDishState] = useState<Record<string, boolean>>(() => Object.fromEntries(dishes.map((d) => [d.id, d.soldOut])));
  const seen = useRef<Set<string> | null>(null);
  const seenReq = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);

  const beep = useCallback((double = false) => {
    const ctx = audio.current;
    if (!ctx) return;
    (double ? [0, 0.25] : [0]).forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.32);
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 12 * 3600_000).toISOString();
      const [o, r] = await Promise.all([
        sb.current.from("orders").select(SELECT).or("status.in.(received,preparing,ready),and(status.eq.served,payment_status.eq.unpaid)").gte("placed_at", since).order("placed_at"),
        sb.current.from("service_requests").select("id,kind,created_at,bench:benches(label)").eq("status", "open").order("created_at"),
      ]);
      if (o.error || r.error) throw o.error ?? r.error;
      const list = o.data as unknown as KOrder[];
      const reqs = r.data as unknown as Request[];
      setOffline(false);
      setOrders(list);
      setRequests(reqs);

      const ids = new Set(list.map((x) => x.id));
      if (seen.current) {
        const added = list.filter((x) => !seen.current!.has(x.id) && x.status === "received").map((x) => x.id);
        if (added.length) {
          beep(true);
          setFresh((f) => new Set([...f, ...added]));
          setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !added.includes(id)))), 10_000);
        }
      }
      seen.current = ids;
      const reqIds = new Set(reqs.map((x) => x.id));
      if (seenReq.current && reqs.some((x) => !seenReq.current!.has(x.id))) beep();
      seenReq.current = reqIds;
    } catch {
      setOffline(true);
    }
  }, [beep]);

  // Realtime pushes changes; polling is the fallback if the socket drops.
  useEffect(() => {
    const first = setTimeout(load, 0);
    // One order moving through its stages fires several events in a burst; wait a moment and reload once.
    let queued: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      clearTimeout(queued);
      queued = setTimeout(load, 300);
    };
    const channel = sb.current
      .channel("kitchen")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, reload)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const client = sb.current;
    return () => {
      clearTimeout(first);
      clearTimeout(queued);
      void client.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    // Realtime is the main path; this is the safety net, so it is slow while the socket is up and idle while the screen is off.
    const id = setInterval(() => !document.hidden && load(), live ? 30_000 : 5_000);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const wake = () => !document.hidden && load();
    window.addEventListener("online", load);
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(id);
      clearInterval(tick);
      window.removeEventListener("online", load);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [load, live]);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
  }, [printing]);

  async function toggleSound() {
    if (!soundOn) {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      beep();
    }
    setSoundOn((v) => !v);
  }

  async function rpc(fn: "set_order_status" | "mark_counter_paid", args: Record<string, string>) {
    setError("");
    const { error: e } = await sb.current.rpc(fn, args);
    if (e) setError(e.code === "P0001" ? e.message : "No connection. Try again.");
    await load();
  }

  const all = orders ?? [];
  const visible = all.filter((o) => filter === "all" || o.order_type === filter);
  const col = (statuses: OrderStatus[]) => visible.filter((o) => statuses.includes(o.status));
  const awaiting = visible.filter((o) => o.status === "served" && o.payment_status === "unpaid");
  const isOpen = (o: KOrder) => o.status === "received" || o.status === "preparing" || o.status === "ready";
  const counts = { received: all.filter((o) => o.status === "received").length, preparing: all.filter((o) => o.status === "preparing").length, ready: all.filter((o) => o.status === "ready").length };
  const typeCount = (t: KOrder["order_type"]) => all.filter((o) => isOpen(o) && o.order_type === t).length;
  const toCook = (() => {
    const m = new Map<string, number>();
    all.filter((o) => o.status === "received" || o.status === "preparing").forEach((o) => o.items.forEach((i) => m.set(i.name, (m.get(i.name) ?? 0) + i.qty)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  })();
  const btn = "min-h-14 rounded-xl px-4 text-lg font-semibold transition active:scale-95";

  async function flipDish(id: string, next: boolean) {
    setDishState((s) => ({ ...s, [id]: next }));
    try {
      await setSoldOut(id, next);
    } catch {
      setDishState((s) => ({ ...s, [id]: !next }));
      setError("Could not update that dish. Check the connection.");
    }
  }

  const stage: Record<string, { name: string; text: string; bar: string; btn: string }> = {
    received: { name: "New", text: "text-brand", bar: "bg-brand", btn: "bg-brand text-brand-foreground" },
    preparing: { name: "Cooking", text: "text-gold", bar: "bg-gold", btn: "bg-gold text-[#2a1d17]" },
    ready: { name: "Ready to serve", text: "text-veg", bar: "bg-veg", btn: "bg-veg text-white" },
    served: { name: "Served", text: "text-muted", bar: "bg-taupe", btn: "bg-taupe text-white" },
  };

  const renderCard = (o: KOrder) => {
    const age = minutesAgo(o.placed_at, now);
    const working = o.status === "received" || o.status === "preparing";
    const late = working && age >= 20;
    const warn = working && age >= 10 && !late;
    const next = NEXT[o.status];
    const st = stage[o.status];
    const urgency = !working ? "bg-veg" : late ? "bg-nonveg" : warn ? "bg-gold" : "bg-veg";
    return (
      <li key={o.id} className={`overflow-hidden rounded-2xl border-2 bg-surface shadow-card ${fresh.has(o.id) ? "kitchen-new border-brand" : late ? "border-nonveg" : "border-border"}`}>
        <div className={`h-1.5 ${st.bar}`} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-baseline gap-2">
                <span className="display text-4xl tabular-nums">#{o.order_no}</span>
                <span className="truncate text-xl font-semibold">{placeLabel(o)}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${o.order_type === "delivery" ? "bg-info text-background" : o.order_type === "takeaway" ? "bg-gold text-[#2a1d17]" : "bg-white/10 text-foreground"}`}>{orderTypeLabel[o.order_type]}</span>
                {o.guest_name && <span>{o.guest_name}</span>}
                {o.guest_phone && <a className="underline" href={`tel:${o.guest_phone}`}>{o.guest_phone}</a>}
              </p>
              {o.delivery_address && (
                <p className="mt-1.5 text-base">
                  <span className="font-semibold">Deliver to:</span> {o.delivery_address} <span className="text-muted">({o.delivery_km} km)</span>{" "}
                  <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.delivery_address)}`}>Map</a>
                </p>
              )}
            </div>
            <p className={`shrink-0 text-right text-2xl font-bold tabular-nums ${late ? "text-nonveg" : warn ? "text-gold" : "text-muted"}`}>{age}<span className="text-sm font-medium"> min</span></p>
          </div>
          {working && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${age} minutes old`}>
              <div className={`h-full rounded-full ${urgency} transition-all`} style={{ width: `${Math.min(100, (age / 20) * 100)}%` }} />
            </div>
          )}
          <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
            {o.items.map((i) => (
              <li key={i.id} className="text-xl leading-snug">
                <span className="font-bold tabular-nums text-gold">{i.qty} ×</span> {i.name}
                {i.variant_name && <span className="font-semibold"> ({i.variant_name})</span>}
                {i.addons.length > 0 && <span className="block text-base text-muted">+ {i.addons.map((a) => a.name).join(", ")}</span>}
                {i.note && <span className="mt-0.5 block rounded bg-brand/15 px-2 py-0.5 text-base font-medium text-brand">{i.note}</span>}
              </li>
            ))}
          </ul>
          {o.note && <p className="mt-3 rounded-lg bg-brand/15 p-2 text-lg font-medium text-brand">Note: {o.note}</p>}
          <p className="mt-3 text-sm text-muted">{formatPrice(o.total)} · {o.payment_status === "paid" ? "Paid" : o.payment_method === "counter" ? "Pays at counter" : "Online, pending"}</p>
          <div className="mt-3 grid gap-2">
            {next && <button onClick={() => rpc("set_order_status", { p_id: o.id, p_status: next.to })} className={`${btn} ${st.btn}`}>{next.label}</button>}
            {o.payment_method === "counter" && o.payment_status === "unpaid" && (
              <button onClick={() => rpc("mark_counter_paid", { p_id: o.id })} className={`${btn} border-2 border-veg text-veg`}>Mark paid</button>
            )}
            <div className="flex gap-2 text-base">
              {BACK[o.status] && o.status !== "served" && <button onClick={() => rpc("set_order_status", { p_id: o.id, p_status: BACK[o.status]! })} className="min-h-12 flex-1 rounded-xl border border-border">Back</button>}
              <button onClick={() => setPrinting(o)} className="min-h-12 flex-1 rounded-xl border border-border">Print KOT</button>
              {o.status !== "served" && o.payment_status !== "paid" && (
                <button onClick={() => confirm(`Cancel order #${o.order_no}?`) && rpc("set_order_status", { p_id: o.id, p_status: "cancelled" })} className="min-h-12 flex-1 rounded-xl border border-nonveg text-nonveg">Cancel</button>
              )}
            </div>
          </div>
        </div>
      </li>
    );
  };

  const columns: { key: OrderStatus; statuses: OrderStatus[] }[] = [
    { key: "received", statuses: ["received"] },
    { key: "preparing", statuses: ["preparing"] },
    { key: "ready", statuses: ["ready"] },
  ];
  const filters: { v: "all" | KOrder["order_type"]; label: string; n: number }[] = [
    { v: "all", label: "All", n: counts.received + counts.preparing + counts.ready },
    { v: "dine_in", label: "Dine in", n: typeCount("dine_in") },
    { v: "takeaway", label: "Takeaway", n: typeCount("takeaway") },
    { v: "delivery", label: "Delivery", n: typeCount("delivery") },
  ];
  const dishList = dishes
    .filter((d) => !dishQ || d.name.toLowerCase().includes(dishQ.toLowerCase()))
    .sort((a, b) => Number(dishState[b.id]) - Number(dishState[a.id]) || a.name.localeCompare(b.name))
    .slice(0, 60);
  const soldCount = Object.values(dishState).filter(Boolean).length;

  return (
    <>
      <div className="kitchen-theme min-h-svh print:hidden">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-espresso px-4 py-2.5 text-[#fbf6ef]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Wordmark className="text-4xl !text-gold" />
              <h1 className="display text-2xl">Kitchen</h1>
              <span className={`inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm ${offline ? "text-[#ff9aa2]" : "text-[#d9cbbd]"}`} role="status">
                <span className={`h-2.5 w-2.5 rounded-full ${offline ? "bg-nonveg" : live ? "bg-veg" : "bg-taupe"}`} />
                {offline ? "No connection" : live ? "Live" : "Checking every 5s"}
              </span>
              <span className="flex gap-1.5 text-xs font-bold">
                <span className="rounded-full bg-brand px-2.5 py-1 text-brand-foreground">{counts.received} new</span>
                <span className="rounded-full bg-gold px-2.5 py-1 text-[#2a1d17]">{counts.preparing} cooking</span>
                <span className="rounded-full bg-veg px-2.5 py-1 text-white">{counts.ready} ready</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSoldPanel(true)} className="min-h-11 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-medium">Sold out{soldCount ? ` (${soldCount})` : ""}</button>
              <button onClick={toggleSound} aria-pressed={soundOn} className="min-h-11 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-medium">{soundOn ? "Sound on" : "Turn sound on"}</button>
              {actions}
            </div>
          </div>
        </header>

        {offline && <p role="alert" className="bg-nonveg/15 px-4 py-2 text-center text-sm text-nonveg">Connection lost. Showing the last orders. New orders appear when it comes back.</p>}
        {error && <p role="alert" className="bg-nonveg/15 px-4 py-2 text-center text-nonveg">{error}</p>}

        {requests.length > 0 && (
          <ul className="flex flex-wrap gap-3 px-4 pt-4" aria-label="Table requests">
            {requests.map((r) => (
              <li key={r.id} className="kitchen-new flex items-center gap-3 rounded-2xl border-2 border-info bg-surface px-4 py-2">
                <span className="text-xl font-bold">{r.bench?.label ?? "Table"}</span>
                <span className="text-lg">{r.kind === "waiter" ? "needs a waiter" : "wants the bill"}</span>
                <span className="text-sm text-muted">{minutesAgo(r.created_at, now)} min</span>
                <button
                  className="min-h-11 rounded-xl bg-info px-4 font-semibold text-background"
                  onClick={async () => {
                    setRequests((l) => l.filter((x) => x.id !== r.id));
                    await sb.current.from("service_requests").update({ status: "done" }).eq("id", r.id);
                  }}
                >
                  Done
                </button>
              </li>
            ))}
          </ul>
        )}

        {toCook.length > 0 && (
          <section aria-label="To cook now" className="flex items-center gap-3 overflow-x-auto px-4 pt-4 [scrollbar-width:none]">
            <span className="shrink-0 text-xs font-bold uppercase tracking-[0.18em] text-gold">To cook now</span>
            {toCook.map(([name, qty]) => (
              <span key={name} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-base">
                <b className="display text-xl tabular-nums text-gold">{qty}</b> {name}
              </span>
            ))}
          </section>
        )}

        <div className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none]" role="group" aria-label="Order type">
          {filters.map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} aria-pressed={filter === f.v} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-base font-medium ${filter === f.v ? "border-foreground bg-foreground text-background" : "border-border bg-surface"}`}>
              {f.label} <span className="text-sm opacity-70">{f.n}</span>
            </button>
          ))}
        </div>

        {orders === null ? (
          <p className="p-10 text-center text-xl text-muted">{offline ? "Waiting for a connection…" : "Loading orders…"}</p>
        ) : (
          <>
            <div className="grid gap-4 p-4 lg:grid-cols-3">
              {columns.map((c) => {
                const list = col(c.statuses);
                const st = stage[c.key];
                return (
                  <section key={c.key} aria-label={st.name}>
                    <h2 className="mb-3 flex items-center justify-between gap-2 text-2xl font-bold">
                      <span className="flex items-center gap-2"><i className={`h-3 w-3 rounded-full ${st.bar}`} />{st.name}</span>
                      <span className={`rounded-full bg-white/10 px-3 text-lg tabular-nums ${st.text}`}>{list.length}</span>
                    </h2>
                    <ul className="space-y-4">
                      {list.map(renderCard)}
                      {list.length === 0 && <li className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">Nothing here</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
            {awaiting.length > 0 && (
              <section className="px-4 pb-10" aria-label="Served, waiting for payment">
                <h2 className="mb-3 text-2xl font-bold">Served, waiting for payment <span className="text-lg text-muted">({awaiting.length})</span></h2>
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{awaiting.map(renderCard)}</ul>
              </section>
            )}
          </>
        )}

        {soldPanel && (
          <div role="dialog" aria-modal="true" aria-label="Sold out dishes" className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
            <div className="flex max-h-[85svh] w-full max-w-lg flex-col rounded-t-3xl bg-background p-5 sm:rounded-3xl">
              <div className="flex items-center justify-between gap-3">
                <h2 className="display text-2xl">Sold out dishes</h2>
                <button onClick={() => setSoldPanel(false)} className="min-h-11 rounded-full border border-border px-4 text-sm font-medium">Done</button>
              </div>
              <p className="mt-1 text-sm text-muted">Switch a dish off the moment it runs out. Customers see it straight away.</p>
              <input value={dishQ} onChange={(e) => setDishQ(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className="mt-3 min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-brand" />
              <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {dishList.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => flipDish(d.id, !dishState[d.id])} role="switch" aria-checked={dishState[d.id]} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left text-base ${dishState[d.id] ? "border-nonveg bg-nonveg/10" : "border-border bg-surface"}`}>
                      <span className="font-medium">{d.name}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${dishState[d.id] ? "bg-nonveg text-background" : "bg-white/10 text-muted"}`}>{dishState[d.id] ? "SOLD OUT" : "Available"}</span>
                    </button>
                  </li>
                ))}
                {dishList.length === 0 && <li className="py-6 text-center text-muted">No dish matches.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
      {printing && <div className="hidden print:block"><Kot o={printing} /></div>}
    </>
  );
}

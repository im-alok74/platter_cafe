import { formatMoney } from "@/lib/format";
import "./kot.css";

type Line = { id: string; name: string; variant_name: string | null; qty: number; addons: { name: string }[]; note: string | null };
export type KotOrder = {
  order_no: number; order_type: "dine_in" | "takeaway" | "delivery"; placed_at: string;
  guest_name: string | null; guest_phone: string | null; note: string | null; table_hint: string | null; bench: { label: string } | null;
  delivery_address: string | null; delivery_km: number | null; payment_status: string; payment_method: string; total: number; items: Line[];
};

const clock = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
const day = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
const TYPE = { dine_in: "DINE IN", takeaway: "TAKEAWAY", delivery: "DELIVERY" } as const;

/**
 * The kitchen order ticket. Built for an 80 mm receipt printer: black and white only, big numbers, nothing the cook does
 * not need. Prices stay off the ticket (except cash to collect on a delivery). Quantities of 2 or more are printed as a
 * solid black box so they cannot be missed. Styles are in kot.css and only apply when printing.
 */
export function Kot({ o, printedAt }: { o: KotOrder; printedAt: number }) {
  const placed = new Date(o.placed_at);
  const place = o.order_type === "dine_in" ? (o.bench?.label ?? (o.table_hint ? `Table ${o.table_hint}` : "Dine in")) : null;
  const pieces = o.items.reduce((n, i) => n + i.qty, 0);
  const collect = o.order_type === "delivery" && o.payment_status !== "paid";

  return (
    <article className="kot">
      <header className="kot-head">
        <p className="kot-brand">PLATTER</p>
        <p className="kot-sub">Kitchen order ticket</p>
      </header>

      <p className="kot-no">#{o.order_no}</p>
      <div className="kot-type"><span>{TYPE[o.order_type]}</span><span>{clock.format(placed)}</span></div>
      {place && <p className="kot-place">{place}</p>}

      <p className="kot-meta">
        <span>Placed {clock.format(placed)}, {day.format(placed)}</span>
        {(o.guest_name || o.guest_phone) && <span>{[o.guest_name, o.guest_phone].filter(Boolean).join(" · ")}</span>}
      </p>

      {o.order_type === "delivery" && o.delivery_address && (
        <div className="kot-box">
          <b className="kot-tag">DELIVER TO{o.delivery_km ? ` · ${o.delivery_km} KM` : ""}</b>
          <p>{o.delivery_address}</p>
        </div>
      )}

      <ol className="kot-items">
        {o.items.map((i) => (
          <li key={i.id}>
            <span className={`kot-qty ${i.qty > 1 ? "kot-qty-many" : ""}`}>{i.qty}</span>
            <span className="kot-what">
              <span className="kot-name">{i.name}</span>
              {i.variant_name && <span className="kot-variant">{i.variant_name}</span>}
              {i.addons.map((a) => <span key={a.name} className="kot-addon">+ {a.name}</span>)}
              {i.note && <span className="kot-itemnote">{i.note}</span>}
            </span>
          </li>
        ))}
      </ol>

      {o.note && (
        <div className="kot-box kot-box-note">
          <b className="kot-tag">ORDER NOTE</b>
          <p>{o.note}</p>
        </div>
      )}

      <p className="kot-total"><span>TOTAL ITEMS</span><span>{pieces}</span></p>
      <p className="kot-pay">
        {o.payment_status === "paid" ? "PAID" : collect ? <>CASH ON DELIVERY <b>{formatMoney(o.total)}</b></> : "PAYS AT COUNTER"}
      </p>

      <p className="kot-foot">Printed {clock.format(new Date(printedAt))}</p>
    </article>
  );
}

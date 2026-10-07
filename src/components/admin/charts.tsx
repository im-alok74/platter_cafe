import { formatPrice } from "@/lib/format";

/* Small charts drawn as plain SVG, so they cost no JavaScript and work in the dark theme (colours follow the page). */

const compact = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

/** Sales as bars with orders as a line on top. Hover or long-press a day to read its numbers. */
export function TrendChart({ data }: { data: { label: string; sales: number; orders: number }[] }) {
  const W = 520, H = 250, padL = 56, padR = 12, padT = 14, padB = 32;
  const maxSales = Math.max(1, ...data.map((d) => d.sales));
  const maxOrders = Math.max(1, ...data.map((d) => d.orders));
  const step = (W - padL - padR) / data.length;
  const bw = Math.min(34, step * 0.62);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / maxSales);
  const yo = (v: number) => padT + (H - padT - padB) * (1 - v / maxOrders);
  const x = (i: number) => padL + step * i + step / 2;
  const every = Math.ceil(data.length / 5);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${yo(d.orders).toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sales and orders per day" className="w-full">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(maxSales * t)} y2={y(maxSales * t)} stroke="var(--border)" strokeDasharray={t ? "3 4" : undefined} />
            <text x={padL - 8} y={y(maxSales * t) + 4} textAnchor="end" fontSize="14" fill="var(--muted)">{t ? `₹${compact(Math.round(maxSales * t))}` : "0"}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.label + i}>
            <rect x={x(i) - bw / 2} y={y(d.sales)} width={bw} height={Math.max(0, H - padB - y(d.sales))} rx={6} fill={i === data.length - 1 ? "var(--brand)" : "var(--gold)"} opacity={i === data.length - 1 ? 1 : 0.55}>
              <title>{`${d.label}: ${formatPrice(d.sales)} from ${d.orders} ${d.orders === 1 ? "order" : "orders"}`}</title>
            </rect>
            {i % every === 0 && <text x={x(i)} y={H - 9} textAnchor="middle" fontSize="14" fill="var(--muted)">{d.label}</text>}
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={yo(d.orders)} r={3} fill="var(--surface)" stroke="var(--foreground)" strokeWidth="1.8"><title>{`${d.label}: ${d.orders} orders`}</title></circle>)}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-gold" /> Sales (₹)</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-foreground" /> Orders</span>
      </figcaption>
    </figure>
  );
}

/** Orders by hour of the day: shows the rush. The busiest hour is highlighted. */
export function HourChart({ data }: { data: { hour: number; orders: number }[] }) {
  const shown = data.filter((d) => d.hour >= 7);
  const max = Math.max(1, ...shown.map((d) => d.orders));
  const peak = shown.reduce((a, b) => (b.orders > a.orders ? b : a), shown[0]);
  const W = 360, H = 210, padB = 28, padT = 10;
  const step = W / shown.length;
  const label = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Orders by hour" className="w-full">
      {shown.map((d, i) => {
        const h = ((H - padB - padT) * d.orders) / max;
        return (
          <g key={d.hour}>
            <rect x={i * step + step * 0.14} y={H - padB - h} width={step * 0.72} height={Math.max(h, d.orders ? 3 : 0)} rx={4} fill={d === peak && d.orders > 0 ? "var(--brand)" : "var(--gold)"} opacity={d === peak && d.orders > 0 ? 1 : 0.55}>
              <title>{`${label(d.hour)}: ${d.orders} orders`}</title>
            </rect>
            {d.hour % 3 === 1 && <text x={i * step + step / 2} y={H - 8} textAnchor="middle" fontSize="13" fill="var(--muted)">{label(d.hour)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const SLICES = ["var(--brand)", "var(--gold)", "var(--info)", "var(--veg)"];

/** Share of orders by type, as a ring with a legend. */
export function Donut({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <svg viewBox="0 0 140 140" role="img" aria-label="Orders by type" className="h-32 w-32 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--border)" strokeWidth="20" />
        {total > 0 &&
          parts.map((p, i) => {
            const len = (p.value / total) * C;
            const seg = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={SLICES[i % SLICES.length]} strokeWidth="20" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}><title>{`${p.label}: ${p.value}`}</title></circle>;
            offset += len;
            return seg;
          })}
      </svg>
      <ul className="min-w-44 flex-1 space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2">
            <i className="h-3 w-3 shrink-0 rounded-sm" style={{ background: SLICES[i % SLICES.length] }} />
            <span>{p.label}</span>
            <span className="ml-auto whitespace-nowrap pl-3 tabular-nums text-muted">{total ? Math.round((p.value / total) * 100) : 0}% · {p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars, for top dishes and sales by menu section. */
export function RankBars({ rows, tone = "gold" }: { rows: { label: string; value: number; display: string }[]; tone?: "gold" | "brand" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{r.display}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full ${tone === "brand" ? "bg-brand" : "bg-gold"}`} style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** ▲ 12% or ▼ 4% against the period before. Shows nothing when there was nothing to compare with. */
export function DeltaBadge({ pct, up, suffix = "vs previous" }: { pct: number | null; up: boolean; suffix?: string }) {
  if (pct === null) return <span className="text-xs text-muted">New, nothing to compare yet</span>;
  return (
    <span className={`text-xs font-medium ${up ? "text-veg" : "text-nonveg"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-normal text-muted">{suffix}</span>
    </span>
  );
}

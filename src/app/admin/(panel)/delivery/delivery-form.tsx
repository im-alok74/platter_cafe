"use client";
import { useActionState, useState } from "react";
import { btn, card, input } from "@/components/admin/ui";
import { deliveryFee, type DeliveryRules } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { saveDelivery, type FormState } from "./actions";

export function DeliveryForm({ rules, enabled }: { rules: DeliveryRules; enabled: boolean }) {
  const [state, action, saving] = useActionState<FormState, FormData>(saveDelivery, {});
  const [r, setR] = useState(rules);
  const set = (k: keyof DeliveryRules) => (e: React.ChangeEvent<HTMLInputElement>) => setR({ ...r, [k]: Number(e.target.value) });
  const field = (k: keyof DeliveryRules, label: string, hint: string, step = "1") => (
    <label className="block text-sm font-medium">
      {label}
      <input name={k} type="number" inputMode="decimal" min={0} step={step} defaultValue={rules[k]} onChange={set(k)} className={`${input} mt-1`} />
      <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>
    </label>
  );
  return (
    <form action={action} className="space-y-5">
      <label className={`${card} flex min-h-11 items-center gap-3 font-medium`}>
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="h-5 w-5 accent-[var(--brand)]" />
        Offer delivery to customers
      </label>
      <section className={`${card} grid gap-4 md:grid-cols-2`}>
        <h2 className="display text-xl md:col-span-2">Distance pricing</h2>
        {field("base_fare", "Base fare (₹)", "Charged for the first stretch.")}
        {field("base_km", "Base distance (km)", "The base fare covers this many km.", "0.5")}
        {field("per_km", "Rate per extra km (₹)", "Added for every km after the base distance.")}
        {field("max_km", "Furthest we deliver (km)", "Orders from further away are refused.", "0.5")}
        {field("free_above", "Free delivery above (₹)", "Order value for free delivery. 0 means never free.")}
        {field("min_order", "Minimum order for delivery (₹)", "0 means no minimum.")}
      </section>
      <section className={`${card}`}>
        <h2 className="display mb-2 text-xl">What customers will pay</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {[1, 2, 3, 5, 8].filter((km) => km <= r.max_km).map((km) => (
            <li key={km} className="flex justify-between rounded-lg bg-background px-3 py-2"><span>{km} km</span><strong className="tabular-nums">{formatPrice(deliveryFee(km, 0, r))}</strong></li>
          ))}
        </ul>
      </section>
      {state.error && <p role="alert" className="text-sm text-nonveg">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-veg">Saved. The website uses the new rates straight away.</p>}
      <button disabled={saving} className={`${btn.primary} w-full`}>{saving ? "Saving…" : "Save"}</button>
    </form>
  );
}

"use server";
import { z } from "zod";
import { deliveryFee, haversineKm } from "@/lib/delivery";
import { getSettings } from "@/lib/data/site";

export type Quote = { ok: true; km: number; fee: number; lat: number; lng: number; label: string; tooFar: boolean } | { ok: false; error: string };

const UA = { "User-Agent": "PlatterCafe/1.0 (hello.plattercafe@gmail.com)", "Accept-Language": "en" };
const input = z.object({
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  subtotal: z.number().min(0).max(100000),
});

/** Free map data: OpenStreetMap to find the address, and the OSRM road router for the distance. */
async function geocode(address: string) {
  const q = /jaipur/i.test(address) ? address : `${address}, Jaipur`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&viewbox=75.55,27.15,76.05,26.65&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const hit = ((await res.json()) as { lat: string; lon: string; display_name: string }[])[0];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
}

async function reverse(lat: number, lng: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: UA, signal: AbortSignal.timeout(5000) });
    return res.ok ? (((await res.json()) as { display_name?: string }).display_name ?? "") : "";
  } catch {
    return "";
  }
}

async function roadKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const meters = ((await res.json()) as { routes?: { distance: number }[] }).routes?.[0]?.distance;
    if (meters) return meters / 1000;
  } catch {
    /* router down: fall back below */
  }
  return haversineKm(from, to) * 1.35; // straight line plus a typical road factor
}

/** Works out how far the customer is by road and what delivery will cost. The database repeats the maths when the order is placed. */
export async function quoteDelivery(raw: z.input<typeof input>): Promise<Quote> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Please check the address." };
  const { delivery } = await getSettings();
  let spot = p.data.lat !== undefined && p.data.lng !== undefined ? { lat: p.data.lat, lng: p.data.lng, label: p.data.address ?? "" } : null;
  if (!spot) {
    if (!p.data.address || p.data.address.length < 6) return { ok: false, error: "Type your address, or tap Use my location." };
    const found = await geocode(p.data.address).catch(() => null);
    if (!found) return { ok: false, error: "We could not find that address. Add a landmark or area name, or tap Use my location." };
    spot = found;
  } else if (!spot.label) {
    spot.label = await reverse(spot.lat, spot.lng);
  }
  const km = Math.round((await roadKm({ lat: delivery.lat, lng: delivery.lng }, spot)) * 10) / 10;
  return { ok: true, km, fee: deliveryFee(km, p.data.subtotal, delivery), lat: spot.lat, lng: spot.lng, label: spot.label, tooFar: km > delivery.max_km };
}

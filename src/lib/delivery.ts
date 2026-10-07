export type DeliveryRules = {
  base_fare: number; // covers the first base_km
  base_km: number;
  per_km: number; // for every km after that
  max_km: number;
  free_above: number; // 0 = never free
  min_order: number;
  lat: number; // the cafe
  lng: number;
};

/** Same formula as place_order in the database: base fare, then a rate per extra km, rounded up to a whole rupee. */
export function deliveryFee(km: number, subtotal: number, r: DeliveryRules) {
  if (r.free_above > 0 && subtotal >= r.free_above) return 0;
  return Math.ceil(r.base_fare + Math.max(0, km - r.base_km) * r.per_km);
}

/** Straight-line distance in km. Used only if the road-routing service is down. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

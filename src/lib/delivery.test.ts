import { describe, expect, it } from "vitest";
import { deliveryFee, haversineKm, type DeliveryRules } from "./delivery";

const rules: DeliveryRules = { base_fare: 30, base_km: 2, per_km: 10, max_km: 8, free_above: 0, min_order: 0, lat: 26.8668664, lng: 75.8190989 };

describe("deliveryFee", () => {
  it("charges the base fare inside the base distance", () => {
    expect(deliveryFee(0.5, 300, rules)).toBe(30);
    expect(deliveryFee(2, 300, rules)).toBe(30);
  });
  it("adds the per-km rate after that, rounded up to a rupee (matches the database)", () => {
    expect(deliveryFee(3.5, 300, rules)).toBe(45);
    expect(deliveryFee(3.51, 300, rules)).toBe(46);
    expect(deliveryFee(8, 300, rules)).toBe(90);
  });
  it("is free above the free-delivery amount when one is set", () => {
    expect(deliveryFee(5, 500, { ...rules, free_above: 500 })).toBe(0);
    expect(deliveryFee(5, 499, { ...rules, free_above: 500 })).toBe(60);
  });
});

it("haversine is about right: Jhalana to Sansthan Path start is a few km", () => {
  const km = haversineKm({ lat: 26.8668664, lng: 75.8190989 }, { lat: 26.9154568, lng: 75.8015928 });
  expect(km).toBeGreaterThan(5);
  expect(km).toBeLessThan(6.5);
});

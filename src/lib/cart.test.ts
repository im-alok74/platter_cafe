import { beforeEach, describe, expect, it } from "vitest";
import { cart } from "./cart";
import { formatPrice } from "./format";

const poha = { itemId: "i1", name: "Poha", isVeg: true, variantId: null, variantName: null, addonIds: [], addonNames: [], unitPrice: 80, qty: 1, note: "" };

describe("cart", () => {
  beforeEach(() => cart.clear());

  it("merges the same choice into one line and caps quantity at 20", () => {
    cart.add(poha);
    cart.add({ ...poha, qty: 25 });
    expect(cart.snapshot().lines).toHaveLength(1);
    expect(cart.snapshot().lines[0].qty).toBe(20);
  });

  it("keeps different options and add-ons as separate lines", () => {
    cart.add(poha);
    cart.add({ ...poha, addonIds: ["a1"], addonNames: ["Extra butter"] });
    cart.add({ ...poha, note: "no onion" });
    expect(cart.snapshot().lines).toHaveLength(3);
  });

  it("removes a line when its quantity reaches zero", () => {
    cart.add(poha);
    cart.setQty(cart.snapshot().lines[0].key, 0);
    expect(cart.snapshot().lines).toHaveLength(0);
  });

  it("keeps one request key per attempt, and a fresh one after the cart is cleared", () => {
    const a = cart.requestKey();
    expect(cart.requestKey()).toBe(a);
    cart.clear();
    expect(cart.requestKey()).not.toBe(a);
  });
});

describe("formatPrice", () => {
  it("prints whole rupees plainly and paise with two digits", () => {
    expect(formatPrice(80)).toBe("₹80");
    expect(formatPrice(997.5)).toBe("₹997.50");
  });
});

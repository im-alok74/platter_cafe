import { describe, expect, it } from "vitest";
import { buildReorderLines, type CatalogItem } from "./reorder";

const poha: CatalogItem = { name: "Poha", isVeg: true, price: 90, soldOut: false, variants: [], addons: [{ id: "a1", name: "Extra Butter", price: 20 }] };
const bc: CatalogItem = { name: "Butter Chicken", isVeg: false, price: 380, soldOut: false, variants: [{ id: "v1", name: "Half", price: 380 }, { id: "v2", name: "Full", price: 760 }], addons: [] };
const catalog = { p: poha, b: bc, s: { ...poha, name: "Sold", soldOut: true } };

describe("buildReorderLines", () => {
  it("uses today's prices, not the old ones, and keeps options and extras", () => {
    const r = buildReorderLines([
      { item_id: "p", name: "Poha", variant_name: null, qty: 2, addons: [{ id: "a1", name: "Extra Butter" }] },
      { item_id: "b", name: "Butter Chicken", variant_name: "Full", qty: 1, addons: [] },
    ], catalog);
    expect(r.lines.map((l) => [l.name, l.unitPrice, l.qty])).toEqual([["Poha", 110, 2], ["Butter Chicken", 760, 1]]);
    expect(r.lines[1].variantId).toBe("v2");
    expect(r.added).toBe(3);
    expect(r.skipped).toEqual([]);
  });

  it("skips and reports sold out, removed and changed-option items", () => {
    const r = buildReorderLines([
      { item_id: "s", name: "Sold", variant_name: null, qty: 1, addons: [] },
      { item_id: "gone", name: "Removed dish", variant_name: null, qty: 1, addons: [] },
      { item_id: null, name: "Deleted item", variant_name: null, qty: 1, addons: [] },
      { item_id: "b", name: "Butter Chicken", variant_name: "Quarter", qty: 1, addons: [] },
    ], catalog);
    expect(r.lines).toHaveLength(0);
    expect(r.skipped).toEqual(["Sold", "Removed dish", "Deleted item", "Butter Chicken"]);
  });

  it("drops an extra that no longer exists but keeps the dish", () => {
    const r = buildReorderLines([{ item_id: "p", name: "Poha", variant_name: null, qty: 1, addons: [{ id: "old", name: "Gone" }] }], catalog);
    expect(r.lines[0].addonIds).toEqual([]);
    expect(r.lines[0].unitPrice).toBe(90);
  });
});

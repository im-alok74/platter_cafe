import { describe, expect, it } from "vitest";
import { pageCount, pageOf } from "./paginate";

describe("pageOf", () => {
  it("maps page numbers to inclusive row ranges", () => {
    expect(pageOf("1", 25)).toEqual({ page: 1, from: 0, to: 24 });
    expect(pageOf("3", 25)).toEqual({ page: 3, from: 50, to: 74 });
  });
  it("falls back to page 1 for junk", () => {
    for (const bad of [undefined, "", "0", "-4", "abc", "NaN"]) expect(pageOf(bad, 10).page).toBe(1);
  });
  it("caps absurd pages so a crafted URL can't ask for a huge offset", () => {
    expect(pageOf("999999999", 25).page).toBe(10_000);
  });
});

describe("pageCount", () => {
  it("is at least one page, even when empty", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
  });
});

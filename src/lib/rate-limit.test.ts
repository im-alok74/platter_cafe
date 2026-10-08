import { expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: vi.fn() }));
import { rateLimit } from "./rate-limit";

it("allows up to the limit per window, then resets", () => {
  const t = 1_000;
  expect([1, 2, 3].map(() => rateLimit("k", 2, 100, t))).toEqual([true, true, false]);
  expect(rateLimit("other", 2, 100, t)).toBe(true);
  expect(rateLimit("k", 2, 100, t + 100)).toBe(true);
});

import { expect, it } from "vitest";
import { toE164 } from "./phone";

it("accepts Indian mobiles in common formats", () => {
  for (const v of ["9876543210", "09876543210", "+91 98765 43210", "91-9876543210", "98765-43210"]) expect(toE164(v)).toBe("+919876543210");
});

it("rejects everything else, including foreign and landline-looking numbers", () => {
  for (const v of ["", "12345", "5876543210", "+14155552671", "98765432101", "abcdefghij"]) expect(toE164(v)).toBeNull();
});

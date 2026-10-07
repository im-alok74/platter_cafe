import { expect, it } from "vitest";
import { signParams } from "./cloudinary-sign";

// Example from Cloudinary's signature documentation.
it("signs upload params the way Cloudinary expects", () => {
  const sig = signParams({ timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" }, "abcd");
  expect(sig).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
});

it("sorts params so key order does not matter", () => {
  expect(signParams({ b: 2, a: 1 }, "s")).toBe(signParams({ a: 1, b: 2 }, "s"));
});

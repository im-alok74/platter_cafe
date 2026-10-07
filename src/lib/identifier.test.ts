import { expect, it } from "vitest";
import { isPhoneLogin, loginEmail } from "./identifier";

it("turns a mobile number in any common format into the same private address", () => {
  for (const v of ["9876543210", "098765 43210", "+91 98765 43210", "91-9876543210"]) expect(loginEmail(v)).toBe("919876543210@phone.platter.invalid");
});

it("keeps an email, lower-cased and trimmed", () => {
  expect(loginEmail("  Asha.K@Example.COM ")).toBe("asha.k@example.com");
});

it("rejects things that are neither", () => {
  for (const v of ["", "12345", "1234567890", "nobody@", "a b@c.d"]) expect(loginEmail(v)).toBeNull();
});

it("recognises the private address so it is never shown as an email", () => {
  expect(isPhoneLogin("919876543210@phone.platter.invalid")).toBe(true);
  expect(isPhoneLogin("asha@example.com")).toBe(false);
  expect(isPhoneLogin(null)).toBe(false);
});

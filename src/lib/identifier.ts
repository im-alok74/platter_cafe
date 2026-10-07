import { toE164 } from "./phone";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Customers sign in with a mobile number or an email. A number is kept behind a private address so one password login serves both.
 * This must stay in step with register_customer in the database. Returns the address to sign in with, or null.
 */
export function loginEmail(input: string): string | null {
  const v = input.trim().toLowerCase();
  if (v.includes("@")) return EMAIL.test(v) && v.length <= 120 ? v : null;
  const phone = toE164(v);
  return phone ? `${phone.slice(1)}@phone.platter.invalid` : null;
}

/** True for the private address a mobile number is kept behind, so it is never shown as an email. */
export const isPhoneLogin = (email: string | null | undefined) => Boolean(email?.endsWith("@phone.platter.invalid"));

/** Indian mobile numbers only: 10 digits starting 6 to 9, with or without 0, 91 or +91. Returns +91XXXXXXXXXX or null. */
export function toE164(input: string) {
  const d = input.replace(/\D/g, "").replace(/^(0|91)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

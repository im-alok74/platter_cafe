import { createHash } from "node:crypto";

/** Cloudinary signature: sha1 of the sorted params joined with &, with the API secret appended. */
export function signParams(params: Record<string, string | number>, secret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

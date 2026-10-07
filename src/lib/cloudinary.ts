import "server-only";
import { env } from "@/env";
import { signParams as sign } from "./cloudinary-sign";

export const IMAGE_KINDS = ["menu", "category", "banner", "popup", "gallery", "blog", "logo"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

function creds() {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = env;
  if (!cloud || !key || !secret) throw new Error("Cloudinary is not configured. Add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
  return { cloud, key, secret };
}

/** True when the API key and secret are set, so the admin can say so plainly instead of failing at upload time. */
export const uploadsReady = () => Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

/** Everything the browser needs to upload one file straight to Cloudinary. The secret never leaves the server. */
export function signUpload(kind: ImageKind) {
  const { cloud, key, secret } = creds();
  const params = { allowed_formats: "jpg,png,webp", folder: `platter/${kind}`, timestamp: Math.floor(Date.now() / 1000) };
  return { ...params, api_key: key, cloud_name: cloud, signature: sign(params, secret) };
}

export const deliveryUrl = (publicId: string, version: number) => {
  const { cloud } = creds();
  return `https://res.cloudinary.com/${cloud}/image/upload/v${version}/${publicId}`;
};

/** Removes an asset. Failure is logged, not thrown: an orphaned image must not block an edit. */
export async function destroyAsset(publicId: string) {
  try {
    const { cloud, key, secret } = creds();
    const params = { invalidate: "true", public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
    const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: key, signature: sign(params, secret) });
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: "POST", body });
    if (!res.ok) console.error("cloudinary destroy failed", publicId, res.status);
  } catch (e) {
    console.error("cloudinary destroy error", publicId, e);
  }
}

/** Tiny blurred copy as a data URL for next/image placeholders. */
export async function blurFor(url: string) {
  try {
    const res = await fetch(url.replace("/upload/", "/upload/w_16,q_30,e_blur:300,f_jpg/"));
    return `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

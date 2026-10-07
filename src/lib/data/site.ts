import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/admin";
import type { DeliveryRules } from "@/lib/delivery";
import type { Hours } from "@/lib/hours";

export type Contact = {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  maps_url: string;
  instagram: string;
};
export type Legal = { entity: string; tagline: string; fssai: string; fssai_valid_to: string; gst_number: string };
export type Flags = { delivery: boolean; referrals: boolean; popups: boolean; loyalty: boolean; blog: boolean };
export type TemplateName = "minimal" | "expressive";
export type SiteSettings = { hours: Hours; contact: Contact; legal: Legal; flags: Flags; tax: { gst_percent: number }; delivery: DeliveryRules; template?: { name: TemplateName } };

/** Which public look is switched on. Expressive unless the owner picks Minimal in Admin > Design. */
export const templateOf = (s: Pick<SiteSettings, "template">): TemplateName => (s.template?.name === "minimal" ? "minimal" : "expressive");

/** All public settings in one cached read, tagged "settings". */
export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  const { data, error } = await createPublicClient().from("settings").select("key,value");
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.key, r.value])) as SiteSettings;
}

export type GalleryImage = { id: string; url: string; width: number; height: number; blur: string };

/** Tiny blurred copy of a Cloudinary image as a data URL, for next/image blur placeholders. */
async function blurDataUrl(url: string) {
  const res = await fetch(url.replace("/upload/", "/upload/w_16,q_30,e_blur:300,f_jpg/"));
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

export async function getGallery(): Promise<GalleryImage[]> {
  "use cache";
  cacheTag("gallery");
  cacheLife("hours");
  const { data, error } = await createPublicClient()
    .from("media_assets")
    .select("id,url,width,height")
    .eq("kind", "gallery")
    .order("public_id");
  if (error) throw error;
  return Promise.all(data.map(async (m) => ({ ...m, width: m.width ?? 720, height: m.height ?? 1280, blur: await blurDataUrl(m.url) })));
}

export type Offer = { id: string; name: string; type: string; config: { description?: string }; min_order: number; ends_at: string | null };

export async function getOffers(): Promise<Offer[]> {
  "use cache";
  cacheTag("offers");
  cacheLife("minutes");
  const { data, error } = await createPublicClient().from("offers").select("id,name,type,config,min_order,ends_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Offer[];
}

export type Post = { id: string; slug: string; title: string; excerpt: string | null; published_at: string };

export async function getPosts(): Promise<Post[]> {
  "use cache";
  cacheTag("blog");
  cacheLife("minutes");
  const { data, error } = await createPublicClient().from("blog_posts").select("id,slug,title,excerpt,published_at").order("published_at", { ascending: false });
  if (error) throw error;
  return data as Post[];
}

export type Hero = { url: string; width: number; height: number; blur: string; alt: string };

/** The home page photo, set by the owner as the "home_hero" banner. */
export async function getHero(): Promise<Hero | null> {
  "use cache";
  cacheTag("banners");
  cacheLife("hours");
  const { data, error } = await createPublicClient()
    .from("banners")
    .select("title,image:media_assets!banners_image_id_fkey(url,width,height)")
    .eq("placement", "home_hero")
    .eq("hidden", false)
    .order("sort")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const img = data?.image as unknown as { url: string; width: number | null; height: number | null } | null;
  if (!img) return null;
  return { url: img.url, width: img.width ?? 3840, height: img.height ?? 2880, blur: await blurDataUrl(img.url), alt: data?.title ?? "Platter" };
}

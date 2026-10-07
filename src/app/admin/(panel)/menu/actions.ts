"use server";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { blurFor, deliveryUrl, destroyAsset } from "@/lib/cloudinary";
import { BADGES } from "@/lib/menu-constants";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const time = z.string().regex(/^\d{2}:\d{2}$/).nullable();
const itemSchema = z.object({
  id: z.uuid().optional(),
  category_id: z.uuid("Choose a category."),
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(500).transform((v) => v || null),
  price: z.coerce.number("Enter a price.").min(0).max(100000),
  is_veg: z.boolean(),
  delivery_available: z.boolean(),
  badges: z.array(z.enum(BADGES)),
  addons: z.array(z.uuid()).max(30),
  available_from: time,
  available_to: time,
  variants: z.array(z.object({ name: z.string().trim().min(1).max(60), price: z.coerce.number().min(0).max(100000) })).max(10),
});

const published = () => updateTag("menu");
const text = (f: FormData, k: string) => String(f.get(k) ?? "");
const timeOrNull = (f: FormData, k: string) => text(f, k) || null;

export async function saveItem(_: FormState, form: FormData): Promise<FormState> {
  const staff = await assertStaff();
  let variants: unknown = [];
  try {
    variants = JSON.parse(text(form, "variants") || "[]");
  } catch {
    return { error: "Variants are not valid." };
  }
  const parsed = itemSchema.safeParse({
    id: text(form, "id") || undefined,
    category_id: text(form, "category_id"),
    name: text(form, "name"),
    description: text(form, "description"),
    price: text(form, "price"),
    is_veg: form.get("is_veg") === "on",
    delivery_available: form.get("delivery_available") === "on",
    badges: form.getAll("badges"),
    addons: form.getAll("addons"),
    available_from: timeOrNull(form, "available_from"),
    available_to: timeOrNull(form, "available_to"),
    variants,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, variants: vs, addons, ...fields } = parsed.data;
  if ((fields.available_from === null) !== (fields.available_to === null)) return { error: "Set both the start and end time, or neither." };

  const db = await createClient();
  let itemId = id;
  if (id) {
    const { error } = await db.from("items").update(fields).eq("id", id);
    if (error) return { error: "Could not save the item." };
  } else {
    const { data, error } = await db.from("items").insert({ ...fields, cafe_id: staff.cafeId, sort: 9999 }).select("id").single();
    if (error) return { error: "Could not save the item." };
    itemId = data.id;
  }
  // Variants are replaced as a set. ponytail: not atomic; wrap in an RPC if a half-saved variant list ever matters.
  await db.from("item_variants").delete().eq("item_id", itemId!);
  if (vs.length) await db.from("item_variants").insert(vs.map((v, i) => ({ ...v, item_id: itemId!, cafe_id: staff.cafeId, sort: i })));
  await db.from("item_addons").delete().eq("item_id", itemId!);
  if (addons.length) await db.from("item_addons").insert(addons.map((addon_id) => ({ item_id: itemId!, addon_id })));
  published();
  if (!id) redirect(`/admin/menu/${itemId}`);
  return { ok: true };
}

const toggleField = z.enum(["sold_out", "hidden", "is_special"]);

export async function toggleItem(id: string, field: string, value: boolean) {
  await assertStaff();
  const f = toggleField.parse(field);
  const { error } = await (await createClient()).from("items").update({ [f]: value }).eq("id", z.uuid().parse(id));
  if (error) throw new Error("Could not update the item.");
  published();
}

export async function setPrice(id: string, price: number) {
  await assertStaff();
  const p = z.number().min(0).max(100000).parse(price);
  const { error } = await (await createClient()).from("items").update({ price: p }).eq("id", z.uuid().parse(id));
  if (error) throw new Error("Could not update the price.");
  published();
}

export async function bulkSet(ids: string[], field: string, value: boolean) {
  await assertStaff();
  const f = toggleField.parse(field);
  const { error } = await (await createClient()).from("items").update({ [f]: value }).in("id", z.array(z.uuid()).max(500).parse(ids));
  if (error) throw new Error("Could not update the items.");
  published();
}

export async function reorderItems(orderedIds: string[]) {
  await assertStaff();
  const db = await createClient();
  const ids = z.array(z.uuid()).max(500).parse(orderedIds);
  const results = await Promise.all(ids.map((id, i) => db.from("items").update({ sort: i }).eq("id", id)));
  if (results.some((r) => r.error)) throw new Error("Could not save the new order.");
  published();
}

export async function deleteItem(id: string) {
  await assertStaff();
  const db = await createClient();
  const itemId = z.uuid().parse(id);
  const { data: item } = await db.from("items").select("image:media_assets!items_image_id_fkey(id,public_id)").eq("id", itemId).single();
  const { error } = await db.from("items").delete().eq("id", itemId);
  if (error) throw new Error("Could not delete the item.");
  const img = item?.image as unknown as { id: string; public_id: string } | null;
  if (img) {
    await db.from("media_assets").delete().eq("id", img.id);
    await destroyAsset(img.public_id);
  }
  published();
}

const uploaded = z.object({
  public_id: z.string().regex(/^platter\/menu\/[\w-]+$/, "Unexpected image."),
  version: z.number().int().positive(),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
});

/** Attaches an image the browser just uploaded (signed) to an item, and removes the one it replaces. */
export async function setItemImage(itemId: string, upload: z.input<typeof uploaded>): Promise<FormState & { image?: { url: string; blur: string | null } }> {
  const staff = await assertStaff();
  const u = uploaded.safeParse(upload);
  if (!u.success) return { error: u.error.issues[0].message };
  const db = await createClient();
  const id = z.uuid().parse(itemId);
  const url = deliveryUrl(u.data.public_id, u.data.version);
  const { data: old } = await db.from("items").select("image:media_assets!items_image_id_fkey(id,public_id)").eq("id", id).single();
  const blur = await blurFor(url);
  const { data: asset, error } = await db
    .from("media_assets")
    .upsert({ cafe_id: staff.cafeId, public_id: u.data.public_id, url, kind: "menu", width: u.data.width, height: u.data.height, blur_data_url: blur }, { onConflict: "cafe_id,public_id" })
    .select("id")
    .single();
  if (error) return { error: "Could not save the photo." };
  const { error: linkError } = await db.from("items").update({ image_id: asset.id }).eq("id", id);
  if (linkError) return { error: "Could not attach the photo." };
  const prev = old?.image as unknown as { id: string; public_id: string } | null;
  if (prev && prev.public_id !== u.data.public_id) {
    await db.from("media_assets").delete().eq("id", prev.id);
    await destroyAsset(prev.public_id);
  }
  published();
  return { ok: true, image: { url, blur } };
}

export async function removeItemImage(itemId: string) {
  await assertStaff();
  const db = await createClient();
  const id = z.uuid().parse(itemId);
  const { data } = await db.from("items").select("image:media_assets!items_image_id_fkey(id,public_id)").eq("id", id).single();
  const img = data?.image as unknown as { id: string; public_id: string } | null;
  await db.from("items").update({ image_id: null }).eq("id", id);
  if (img) {
    await db.from("media_assets").delete().eq("id", img.id);
    await destroyAsset(img.public_id);
  }
  published();
}

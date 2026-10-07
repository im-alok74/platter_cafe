import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { ItemForm, type ItemData } from "./item-form";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Edit item" };

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const db = await createClient();
  const [{ data: cats }, { data: allAddons }] = await Promise.all([db.from("categories").select("id,name").order("sort"), db.from("addons").select("id,name,price").order("name")]);
  if (!cats?.length) throw new Error("Create a category first.");

  let item: ItemData = { category_id: cats[0].id, name: "", description: "", price: "", is_veg: true, delivery_available: true, badges: [], available_from: "", available_to: "", variants: [], addons: [], image: null };
  if (id !== "new") {
    if (!z.uuid().safeParse(id).success) notFound();
    const { data } = await db
      .from("items")
      .select("*, variants:item_variants(name,price,sort), item_addons(addon_id), image:media_assets!items_image_id_fkey(url,blur_data_url)")
      .eq("id", id)
      .maybeSingle();
    if (!data) notFound();
    const img = data.image as { url: string; blur_data_url: string | null } | null;
    item = {
      id: data.id,
      category_id: data.category_id,
      name: data.name,
      description: data.description ?? "",
      price: Number(data.price),
      is_veg: data.is_veg,
      delivery_available: data.delivery_available,
      badges: data.badges,
      available_from: hhmm(data.available_from),
      available_to: hhmm(data.available_to),
      variants: [...(data.variants as { name: string; price: number; sort: number }[])].sort((a, b) => a.sort - b.sort).map((v) => ({ name: v.name, price: Number(v.price) })),
      addons: (data.item_addons as { addon_id: string }[]).map((a) => a.addon_id),
      image: img ? { url: img.url, blur: img.blur_data_url } : null,
    };
  }
  return (
    <>
      <h1 className="mb-4 display text-4xl">{item.id ? item.name : "New item"}</h1>
      <ItemForm key={item.id ?? "new"} item={item} categories={cats} addons={allAddons ?? []} />
    </>
  );
}

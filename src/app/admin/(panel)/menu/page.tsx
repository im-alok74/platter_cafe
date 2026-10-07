import { requireStaff } from "@/lib/admin/auth";
import { uploadsReady } from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";
import { MenuManager, type AdminItem } from "./menu-manager";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Menu" };

export default async function AdminMenu({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireStaff();
  const { filter } = await searchParams;
  const db = await createClient();
  const [cats, items] = await Promise.all([
    db.from("categories").select("id,name").order("sort"),
    db.from("items").select("id,category_id,name,price,is_veg,sold_out,hidden,is_special,image:media_assets!items_image_id_fkey(url,blur_data_url)").order("sort"),
  ]);
  if (cats.error || items.error) throw new Error("Could not load the menu.");
  const rows = (items.data as unknown as (Omit<AdminItem, "image" | "price"> & { price: number | string; image: { url: string; blur_data_url: string | null } | null })[]).map((i) => ({
    ...i,
    price: Number(i.price),
    image: i.image ? { url: i.image.url, blur: i.image.blur_data_url } : null,
  }));
  return (
    <>
      <h1 className="mb-3 display text-4xl">Menu</h1>
      <MenuManager categories={cats.data} initial={rows} filter={filter} uploadsReady={uploadsReady()} />
    </>
  );
}

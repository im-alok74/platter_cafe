import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/admin";

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_veg: boolean;
  badges: string[];
  sold_out: boolean;
  is_special: boolean;
  delivery_available: boolean;
  available_from: string | null;
  available_to: string | null;
  image: { url: string; blur_data_url: string | null; width: number | null; height: number | null } | null;
  variants: { id: string; name: string; price: number; sort: number }[];
  addons: { id: string; name: string; price: number }[];
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  delivery_available: boolean;
  image: { url: string; blur_data_url: string | null } | null;
  items: MenuItem[];
};

/** Public menu, cached and tagged "menu". Admin edits call revalidateTag("menu"). Never use for checkout prices. */
export async function getMenu(): Promise<MenuCategory[]> {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");

  const db = createPublicClient();
  const [cats, items] = await Promise.all([
    db.from("categories").select("id,name,slug,delivery_available,image:media_assets!categories_image_id_fkey(url,blur_data_url)").order("sort"),
    db
      .from("items")
      .select(
        "id,category_id,name,description,price,is_veg,badges,sold_out,is_special,delivery_available,available_from,available_to,image:media_assets!items_image_id_fkey(url,blur_data_url,width,height),variants:item_variants(id,name,price,sort),item_addons(addon:addons(id,name,price,hidden))",
      )
      .order("sort"),
  ]);
  if (cats.error) throw cats.error;
  if (items.error) throw items.error;

  type Row = Omit<MenuItem, "addons"> & { item_addons: { addon: { id: string; name: string; price: number; hidden: boolean } | null }[] };
  const rows: MenuItem[] = (items.data as unknown as Row[]).map(({ item_addons, ...i }) => ({
    ...i,
    addons: item_addons.flatMap((a) => (a.addon && !a.addon.hidden ? [{ id: a.addon.id, name: a.addon.name, price: Number(a.addon.price) }] : [])),
  }));
  return (cats.data as unknown as Omit<MenuCategory, "items">[]).map((c) => ({
    ...c,
    items: rows.filter((i) => i.category_id === c.id).map((i) => ({ ...i, variants: [...i.variants].sort((a, b) => a.sort - b.sort) })),
  }));
}

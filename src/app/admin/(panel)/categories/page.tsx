import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager, type AdminCategory } from "./category-manager";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  await requireStaff();
  const db = await createClient();
  const [cats, items] = await Promise.all([
    db.from("categories").select("id,name,hidden,delivery_available,available_from,available_to").order("sort"),
    db.from("items").select("category_id"),
  ]);
  if (cats.error || items.error) throw new Error("Could not load categories.");
  const counts = new Map<string, number>();
  items.data.forEach((i) => counts.set(i.category_id, (counts.get(i.category_id) ?? 0) + 1));
  const initial: AdminCategory[] = cats.data.map((c) => ({
    ...c,
    available_from: c.available_from?.slice(0, 5) ?? "",
    available_to: c.available_to?.slice(0, 5) ?? "",
    items: counts.get(c.id) ?? 0,
  }));
  return (
    <>
      <h1 className="mb-4 display text-4xl">Categories</h1>
      <CategoryManager initial={initial} />
    </>
  );
}

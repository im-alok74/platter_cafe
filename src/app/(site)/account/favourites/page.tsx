import Link from "next/link";
import { btn, card } from "@/components/admin/ui";
import { getCustomer } from "@/lib/customer";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FavouriteRemove } from "./favourite-remove";

// Reads the signed-in session on every request, so this route cannot be an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Favourites" };

export default async function FavouritesPage() {
  const me = await getCustomer();
  const { data, error } = await (await createClient())
    .from("favourites")
    .select("item:items(id,name,price,is_veg,sold_out)")
    .eq("user_id", me?.id ?? "");
  if (error) throw new Error("Could not load your favourites.");
  const items = (data as unknown as { item: { id: string; name: string; price: number; is_veg: boolean; sold_out: boolean } | null }[]).flatMap((r) => (r.item ? [r.item] : []));

  return (
    <>
      <h1 className="mb-4 font-display text-3xl">Favourites</h1>
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-xl">No favourites yet</p>
          <p className="mt-1 text-muted">Tap the heart on a dish when you order, and it will be here.</p>
          <Link href="/menu" className={`${btn.primary} mt-4`}>See the menu</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className={`${card} flex items-center gap-3`}>
              <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${i.is_veg ? "bg-veg" : "bg-nonveg"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{i.name}</p>
                <p className="text-sm text-muted">{formatPrice(Number(i.price))}{i.sold_out ? " · Sold out" : ""}</p>
              </div>
              <FavouriteRemove itemId={i.id} userId={me?.id ?? ""} name={i.name} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

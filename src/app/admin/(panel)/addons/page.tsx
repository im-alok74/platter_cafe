import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { AddonManager } from "./addon-manager";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Add-ons" };

export default async function AdminAddons() {
  await requireStaff();
  const { data, error } = await (await createClient()).from("addons").select("id,name,price,hidden").order("name");
  if (error) throw new Error("Could not load extras.");
  return (
    <>
      <h1 className="mb-1 display text-4xl">Add-ons</h1>
      <p className="mb-4 text-sm text-muted">Extras customers can add to a dish, like extra cheese. Attach them to items in the item editor.</p>
      <AddonManager initial={data.map((a) => ({ ...a, price: Number(a.price) }))} />
    </>
  );
}

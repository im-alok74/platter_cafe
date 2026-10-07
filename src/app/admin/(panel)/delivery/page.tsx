import { requireStaff } from "@/lib/admin/auth";
import type { DeliveryRules } from "@/lib/delivery";
import { createClient } from "@/lib/supabase/server";
import { DeliveryForm } from "./delivery-form";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Delivery" };

export default async function DeliveryPage() {
  await requireStaff();
  const { data, error } = await (await createClient()).from("settings").select("key,value").in("key", ["delivery", "flags"]);
  if (error || !data) throw new Error("Could not load delivery settings.");
  const get = (k: string) => (data.find((d) => d.key === k)?.value ?? {}) as Record<string, unknown>;
  return (
    <>
      <h1 className="mb-1 display text-4xl">Delivery</h1>
      <p className="mb-4 text-sm text-muted">Priced by road distance from the cafe, like a ride app. The rates below are starting values: set your own.</p>
      <DeliveryForm rules={get("delivery") as unknown as DeliveryRules} enabled={Boolean(get("flags").delivery)} />
    </>
  );
}

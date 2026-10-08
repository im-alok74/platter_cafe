"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const num = (max: number) => z.coerce.number().min(0).max(max);
const rules = z.object({
  enabled: z.boolean(),
  base_fare: num(1000),
  base_km: num(50),
  per_km: num(500),
  max_km: z.coerce.number().min(0.5).max(50),
  free_above: num(100000),
  min_order: num(100000),
});

/** Delivery on or off, and the distance pricing: base fare for the first km, then a rate per km, up to a limit. */
export async function saveDelivery(_: FormState, form: FormData): Promise<FormState> {
  const staff = await assertStaff();
  const v = (k: string) => String(form.get(k) ?? "");
  const p = rules.safeParse({
    enabled: form.get("enabled") === "on",
    base_fare: v("base_fare"), base_km: v("base_km"), per_km: v("per_km"),
    max_km: v("max_km"), free_above: v("free_above"), min_order: v("min_order"),
  });
  if (!p.success) return { error: "Check the numbers: they must be zero or more." };
  const { enabled, ...r } = p.data;
  const db = await createClient();
  const { data: current } = await db.from("settings").select("key,value").eq("cafe_id", staff.cafeId).in("key", ["delivery", "flags"]);
  const get = (k: string) => (current?.find((c) => c.key === k)?.value ?? {}) as Record<string, unknown>;
  const { error } = await db.from("settings").upsert(
    [
      { cafe_id: staff.cafeId, key: "delivery", value: { ...get("delivery"), ...r } },
      { cafe_id: staff.cafeId, key: "flags", value: { ...get("flags"), delivery: enabled } },
    ],
    { onConflict: "cafe_id,key" },
  );
  if (error) return { error: "Could not save. Please try again." };
  updateTag("settings");
  return { ok: true };
}

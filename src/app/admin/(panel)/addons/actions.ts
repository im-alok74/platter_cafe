"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const schema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Name is required.").max(60),
  price: z.coerce.number("Enter a price.").min(0).max(10000),
  hidden: z.boolean(),
});

export async function saveAddon(form: FormData): Promise<FormState> {
  const staff = await assertStaff();
  const v = (k: string) => String(form.get(k) ?? "");
  const p = schema.safeParse({ id: v("id") || undefined, name: v("name"), price: v("price"), hidden: form.get("hidden") === "on" });
  if (!p.success) return { error: p.error.issues[0].message };
  const { id, ...fields } = p.data;
  const db = await createClient();
  const { error } = id ? await db.from("addons").update(fields).eq("id", id) : await db.from("addons").insert({ ...fields, cafe_id: staff.cafeId });
  if (error) return { error: "Could not save the extra." };
  updateTag("menu");
  return { ok: true };
}

export async function deleteAddon(id: string): Promise<FormState> {
  await assertStaff();
  const { error } = await (await createClient()).from("addons").delete().eq("id", z.uuid().parse(id));
  if (error) return { error: "Could not delete the extra." };
  updateTag("menu");
  return { ok: true };
}

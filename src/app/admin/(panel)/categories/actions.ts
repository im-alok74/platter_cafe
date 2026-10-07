"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const time = z.string().regex(/^\d{2}:\d{2}$/).nullable();

const schema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Name is required.").max(60),
  hidden: z.boolean(),
  delivery_available: z.boolean(),
  available_from: time,
  available_to: time,
});

export async function saveCategory(form: FormData): Promise<FormState> {
  const staff = await assertStaff();
  const v = (k: string) => String(form.get(k) ?? "");
  const parsed = schema.safeParse({
    id: v("id") || undefined,
    name: v("name"),
    hidden: form.get("hidden") === "on",
    delivery_available: form.get("delivery_available") === "on",
    available_from: v("available_from") || null,
    available_to: v("available_to") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...fields } = parsed.data;
  if ((fields.available_from === null) !== (fields.available_to === null)) return { error: "Set both times, or neither." };
  const db = await createClient();
  const { error } = id
    ? await db.from("categories").update({ ...fields, slug: slugify(fields.name) }).eq("id", id)
    : await db.from("categories").insert({ ...fields, slug: slugify(fields.name), cafe_id: staff.cafeId, sort: 9999 });
  if (error) return { error: error.code === "23505" ? "A category with that name already exists." : "Could not save the category." };
  updateTag("menu");
  return { ok: true };
}

export async function reorderCategories(orderedIds: string[]) {
  await assertStaff();
  const db = await createClient();
  const ids = z.array(z.uuid()).max(100).parse(orderedIds);
  const results = await Promise.all(ids.map((id, i) => db.from("categories").update({ sort: i }).eq("id", id)));
  if (results.some((r) => r.error)) throw new Error("Could not save the new order.");
  updateTag("menu");
}

export async function deleteCategory(id: string): Promise<FormState> {
  await assertStaff();
  const db = await createClient();
  const cid = z.uuid().parse(id);
  const { count } = await db.from("items").select("*", { count: "exact", head: true }).eq("category_id", cid);
  if (count) return { error: `This category still has ${count} items. Move or delete them first, or just hide the category.` };
  const { error } = await db.from("categories").delete().eq("id", cid);
  if (error) return { error: "Could not delete the category." };
  updateTag("menu");
  return { ok: true };
}

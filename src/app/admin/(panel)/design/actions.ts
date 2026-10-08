"use server";
import { updateTag } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

/** Switches the public website between the minimal and expressive looks. */
export async function saveTemplate(_: FormState, form: FormData): Promise<FormState> {
  const staff = await assertStaff();
  const name = form.get("name");
  if (name !== "minimal" && name !== "expressive") return { error: "Pick one of the two looks." };
  const { error } = await (await createClient()).from("settings").upsert({ cafe_id: staff.cafeId, key: "template", value: { name } }, { onConflict: "cafe_id,key" });
  if (error) return { error: "Could not save. Please try again." };
  updateTag("settings");
  return { ok: true };
}

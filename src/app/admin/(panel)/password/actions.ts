"use server";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

/** A staff member changes their own password, after proving they know the current one. */
export async function changeMyPassword(_: FormState, form: FormData): Promise<FormState> {
  const staff = await assertStaff(["owner", "manager", "kitchen"]);
  const next = String(form.get("next") ?? "");
  if (next.length < 8 || next.length > 72) return { error: "Use a new password of at least 8 characters." };
  if (next !== String(form.get("confirm") ?? "")) return { error: "The two new passwords do not match." };
  const db = await createClient();
  const check = await db.auth.signInWithPassword({ email: staff.email, password: String(form.get("current") ?? "") });
  if (check.error) return { error: "Your current password is wrong." };
  const { error } = await db.auth.updateUser({ password: next });
  if (error) return { error: "Could not change the password. Please try again." };
  return { ok: true };
}

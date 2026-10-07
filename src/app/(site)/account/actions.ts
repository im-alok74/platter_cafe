"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCustomer } from "@/lib/customer";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const profile = z.object({ name: z.string().trim().max(60), marketing: z.boolean() });

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const me = await getCustomer();
  if (!me) return { error: "Please sign in again." };
  const p = profile.safeParse({ name: String(form.get("name") ?? ""), marketing: form.get("marketing") === "on" });
  if (!p.success) return { error: "That name is too long." };
  const { error } = await (await createClient()).from("profiles").update({ name: p.data.name || null, marketing_consent: p.data.marketing }).eq("id", me.id);
  if (error) return { error: "Could not save. Please try again." };
  revalidatePath("/account");
  return { ok: true };
}

/** Changes the password after checking the current one. */
export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8 || next.length > 72) return { error: "Use a new password of at least 8 characters." };
  if (next !== String(form.get("confirm") ?? "")) return { error: "The two new passwords do not match." };
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user?.email) return { error: "Please sign in again." };
  const check = await db.auth.signInWithPassword({ email: data.user.email, password: current });
  if (check.error) return { error: "Your current password is wrong." };
  const { error } = await db.auth.updateUser({ password: next });
  if (error) return { error: "Could not change the password. Please try again." };
  return { ok: true };
}

export async function signOutCustomer() {
  await (await createClient()).auth.signOut();
  redirect("/");
}

/** Deletes the account and personal data (DPDP). Past orders stay for accounting with the name and phone removed. */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const db = await createClient();
  const { error } = await db.rpc("delete_my_account");
  if (error) return { error: error.code === "P0001" ? error.message : "Could not delete the account. Please try again." };
  await db.auth.signOut().catch(() => {});
  redirect("/?account=deleted");
}

"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const ERRORS: Record<string, string> = {
  weak_password: "Use a password of at least 8 characters.",
  invalid_identifier: "Enter a valid email.",
  already_registered: "That email already has an account.",
  invalid_role: "Pick a role.",
};
const explain = (message: string, fallback: string) => ERRORS[message] ?? (message.includes("yourself") || message.includes("own role") ? message : fallback);

const add = z.object({ email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")), password: z.string().min(8, "Use a password of at least 8 characters.").max(72), role: z.enum(["owner", "manager", "kitchen"]) });

/** The owner creates a staff account with an email and a first password, and tells the person both. */
export async function addStaff(_: FormState, form: FormData): Promise<FormState> {
  await assertStaff(["owner"]);
  const p = add.safeParse({ email: form.get("email"), password: form.get("password"), role: form.get("role") });
  if (!p.success) return { error: p.error.issues[0].message };
  const { error } = await (await createClient()).rpc("create_staff", { p_email: p.data.email, p_password: p.data.password, p_role: p.data.role });
  if (error) return { error: explain(error.message, "Could not create that account.") };
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function changeRole(email: string, role: string) {
  await assertStaff(["owner"]);
  const { error } = await (await createClient()).rpc("set_staff_role", { p_email: z.email().parse(email), p_role: z.enum(["owner", "manager", "kitchen"]).parse(role) });
  if (error) throw new Error(explain(error.message, "Could not change the role."));
  revalidatePath("/admin/staff");
}

export async function resetPassword(email: string, password: string) {
  await assertStaff(["owner"]);
  const { error } = await (await createClient()).rpc("reset_staff_password", { p_email: z.email().parse(email), p_password: password });
  if (error) throw new Error(explain(error.message, "Could not reset the password."));
}

export async function removeStaff(email: string) {
  await assertStaff(["owner"]);
  const { error } = await (await createClient()).rpc("remove_staff", { p_email: z.email().parse(email) });
  if (error) throw new Error(explain(error.message, "Could not remove that person."));
  revalidatePath("/admin/staff");
}

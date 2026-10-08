"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/customer";
import { TOO_MANY, authAllowed } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/** Staff sign in with email and password. Anyone without a staff role is signed straight back out. */
export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  const wrong = { error: "Wrong email or password, or this is not a staff account." };
  if (!email.success || !password) return wrong;
  if (!(await authAllowed(email.data))) return { error: TOO_MANY };
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({ email: email.data, password });
  if (error) return wrong;
  const { data } = await db.auth.getUser();
  const { data: role } = data.user ? await db.from("staff_roles").select("role").eq("user_id", data.user.id).maybeSingle() : { data: null };
  if (!role) {
    await db.auth.signOut();
    return wrong;
  }
  redirect(await nextPath(form));
}

/** Where to go after sign-in: a `next` form field, else ?next= on the login page (from the Referer), limited to staff pages. */
async function nextPath(form: FormData) {
  let next = form.get("next");
  if (!next) {
    try {
      next = new URL((await headers()).get("referer") ?? "").searchParams.get("next");
    } catch {
      next = null;
    }
  }
  const path = safeNext(next);
  return /^\/(admin|kitchen)(\/|\?|$)/.test(path) && !path.startsWith("/admin/login") ? path : "/admin";
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/admin/login");
}

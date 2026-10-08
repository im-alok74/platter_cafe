"use server";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/customer";
import { loginEmail } from "@/lib/identifier";
import { TOO_MANY, authAllowed, clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

const REGISTER_ERRORS: Record<string, string> = {
  weak_password: "Use a password of at least 8 characters.",
  invalid_identifier: "Enter a 10-digit Indian mobile number or a valid email.",
  already_registered: "That number or email already has an account. Sign in instead.",
  busy: "Too many sign-ups right now. Please try again in a few minutes.",
};

/** Signs in with a mobile number or email and a password. Staff who land here are sent to the admin instead. */
export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = loginEmail(String(form.get("identifier") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your mobile number or email, and your password." };
  if (!(await authAllowed(email))) return { error: TOO_MANY };
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong mobile number, email or password." };
  const { data } = await db.auth.getUser();
  const { data: profile } = data.user ? await db.from("profiles").select("id").eq("id", data.user.id).maybeSingle() : { data: null };
  redirect(profile ? safeNext(form.get("next")) : "/admin");
}

/** Creates a customer account with a mobile number or email and a password, then signs them in. */
export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "");
  const password = String(form.get("password") ?? "");
  const email = loginEmail(identifier);
  if (!email) return { error: REGISTER_ERRORS.invalid_identifier };
  if (password.length < 8) return { error: REGISTER_ERRORS.weak_password };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The two passwords do not match." };
  if (!rateLimit(`register:${await clientIp()}`, 5, 15 * 60_000)) return { error: TOO_MANY };
  const db = await createClient();
  const { error } = await db.rpc("register_customer", { p_identifier: identifier, p_password: password, p_name: String(form.get("name") ?? "") });
  if (error) return { error: REGISTER_ERRORS[error.message] ?? "Could not create the account. Please try again." };
  const signed = await db.auth.signInWithPassword({ email, password });
  if (signed.error) return { error: "Account created. Please sign in." };
  redirect(safeNext(form.get("next")));
}

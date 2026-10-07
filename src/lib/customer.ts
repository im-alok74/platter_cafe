import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Customer = { id: string; phone: string | null; email: string | null; name: string | null; marketingConsent: boolean };

/** The signed-in customer for this request, or null. Staff accounts have no customer profile. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: row } = await db.from("profiles").select("id,phone,email,name,marketing_consent").eq("id", id).maybeSingle();
  return row ? { id: row.id, phone: row.phone, email: row.email, name: row.name, marketingConsent: row.marketing_consent } : null;
});

/** Only same-site paths are allowed as a post-login destination, so a link can't bounce someone to another site. */
export const safeNext = (next: unknown) => (typeof next === "string" && /^\/(?!\/)[\w\-/.?=&%]*$/.test(next) ? next : "/account");

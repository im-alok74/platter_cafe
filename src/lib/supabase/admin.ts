import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

/** Service-role client: bypasses RLS. Only for orders, payments, points and other server-owned writes. */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anonymous client with no cookies, safe inside cached public reads. */
export function createPublicClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

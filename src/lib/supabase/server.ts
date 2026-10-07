import "server-only";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { env } from "@/env";

/**
 * Per-request client acting as the signed-in user (RLS applies). Reads cookies, so never cache its results.
 *
 * Reads come from the Cookie header and writes go through cookies() only when Supabase actually changes a cookie.
 * Calling cookies() on every read throws a false internal error in `next dev` when a page re-renders after a
 * server action (Next 16.3), and this avoids it without changing behaviour in production.
 */
export async function createClient() {
  const sent = parseCookieHeader((await headers()).get("cookie") ?? "");
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => sent.map((c) => ({ name: c.name, value: c.value ?? "" })),
      async setAll(list) {
        try {
          const store = await cookies();
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only: the proxy refreshes the session instead.
        }
      },
    },
  });
}

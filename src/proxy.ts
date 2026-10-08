import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the signed-in session fresh (staff and customers). Authorisation itself is checked on the server in each page and action.
export async function proxy(request: NextRequest) {
  // Lets a logged-out page redirect to the login with ?next= pointing back here.
  request.headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refreshes an expired session. getClaims checks the token locally, so there is no round trip to the Auth server on a normal request.
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/admin/:path*", "/auth/:path*", "/account/:path*", "/t/:path*", "/kitchen/:path*", "/login"] };

import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "manager" | "kitchen";
export type Staff = { userId: string; email: string; role: Role; cafeId: string };

/** The signed-in staff member for this request, or null. Role comes from the database, never from the client. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const db = await createClient();
  // Verified locally from the token; the role is then one primary-key lookup, read fresh so removing someone takes effect at once.
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: row } = await db.from("staff_roles").select("role,cafe_id").eq("user_id", claims.sub).maybeSingle();
  if (!row) return null;
  return { userId: claims.sub, email: typeof claims.email === "string" ? claims.email : "", role: row.role as Role, cafeId: row.cafe_id };
});

/** For pages: send anyone without the right role to the login or dashboard. */
export async function requireStaff(roles: Role[] = ["owner", "manager"]) {
  const staff = await getStaff();
  if (!staff) {
    // The proxy sets x-pathname, so staff land back on the page they asked for after signing in.
    const path = (await headers()).get("x-pathname");
    redirect(path ? `/admin/login?next=${encodeURIComponent(path)}` : "/admin/login");
  }
  if (!roles.includes(staff.role)) redirect("/admin?denied=1");
  return staff;
}

/** For server actions and route handlers: throw instead of redirect. Always call first. */
export async function assertStaff(roles: Role[] = ["owner", "manager"]) {
  const staff = await getStaff();
  if (!staff || !roles.includes(staff.role)) throw new Error("You are not allowed to do that.");
  return staff;
}

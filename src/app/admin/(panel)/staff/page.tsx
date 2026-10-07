import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "./staff-manager";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const staff = await requireStaff(["owner"]);
  const { data, error } = await (await createClient()).rpc("list_staff");
  if (error) throw new Error("Could not load staff.");
  return (
    <>
      <h1 className="mb-1 display text-4xl">Staff</h1>
      <p className="mb-4 text-sm text-muted">Staff sign in with their email and a password. You create the account here and tell them the password; they can change it themselves after signing in.</p>
      <StaffManager members={data ?? []} me={staff.email.toLowerCase()} />
    </>
  );
}

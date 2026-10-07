import { requireStaff } from "@/lib/admin/auth";
import { PasswordForm } from "./password-form";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Change password" };

export default async function PasswordPage() {
  const staff = await requireStaff(["owner", "manager", "kitchen"]);
  return (
    <>
      <h1 className="mb-1 display text-4xl">Change password</h1>
      <p className="mb-4 text-sm text-muted">Signed in as {staff.email}. Pick something only you know.</p>
      <PasswordForm />
    </>
  );
}

import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customer";
import { ProfileForm } from "./profile-form";

// Reads the signed-in session on every request, so this route cannot be an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await getCustomer();
  if (!me) notFound();
  return (
    <>
      <h1 className="font-display text-3xl">{me.name ? `Hello, ${me.name}` : "Welcome"}</h1>
      {!me.name && <p className="mb-4 text-muted">Add your name so we can greet you.</p>}
      <div className="mt-4">
        <ProfileForm name={me.name ?? ""} contact={me.phone ? `+${me.phone.replace(/^\+/, "")}`.replace(/^\+91/, "+91 ") : (me.email ?? "")} marketing={me.marketingConsent} />
      </div>
    </>
  );
}

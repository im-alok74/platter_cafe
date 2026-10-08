import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCustomer } from "@/lib/customer";

// Reads the signed-in session on every request, so this route cannot be an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: { default: "Your account", template: "%s | Your account" }, robots: { index: false, follow: false } };

async function Gate({ children }: { children: ReactNode }) {
  if (!(await getCustomer())) {
    // Come back to the exact account page after signing in. The proxy sets x-pathname.
    const path = (await headers()).get("x-pathname") ?? "/account";
    redirect(`/login?next=${encodeURIComponent(path.startsWith("/account") ? path : "/account")}`);
  }
  return (
    <>
      <AdminNav
        links={[
          { href: "/account", label: "Profile" },
          { href: "/account/orders", label: "Orders" },
          { href: "/account/favourites", label: "Favourites" },
        ]}
      />
      {children}
    </>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      <div className="bg-espresso text-[#fbf6ef]">
        <div className="mx-auto max-w-2xl px-4 pb-7 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Platter</p>
          <p className="display mt-2 text-4xl">Your account</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border" />}>
          <Gate>{children}</Gate>
        </Suspense>
      </div>
    </main>
  );
}

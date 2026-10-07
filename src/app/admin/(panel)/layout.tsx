import { Suspense, type ReactNode } from "react";
import { AdminShell, type NavGroup } from "@/components/admin/admin-shell";
import { requireStaff, type Role } from "@/lib/admin/auth";
import { signOut } from "../login/actions";

// Reads the signed-in session on every request, so these routes cannot be instant (prerendered) navigations.
export const instant = false;
export const metadata = { title: { default: "Admin", template: "%s | Platter admin" }, robots: { index: false, follow: false } };

/** What each role sees. The server also checks the role on every page and action; hiding a link is only a courtesy. */
function groupsFor(role: Role): NavGroup[] {
  const boss = role !== "kitchen";
  const groups: NavGroup[] = [
    {
      title: "Overview",
      links: [
        { href: "/admin", label: "Dashboard", icon: "grid" },
        ...(boss ? [{ href: "/admin/orders", label: "Orders", icon: "receipt" as const }] : []),
        { href: "/kitchen", label: "Kitchen", icon: "flame" },
      ],
    },
  ];
  if (boss) {
    groups.push(
      { title: "Menu", links: [{ href: "/admin/menu", label: "Menu and photos", icon: "utensils" }, { href: "/admin/categories", label: "Categories", icon: "tag" }, { href: "/admin/addons", label: "Add-ons", icon: "plus" }] },
      { title: "Operations", links: [{ href: "/admin/delivery", label: "Delivery", icon: "scooter" }, { href: "/admin/tables", label: "Tables and QR", icon: "qr" }] },
      { title: "Website", links: [{ href: "/admin/design", label: "Design", icon: "palette" }] },
    );
  }
  if (role === "owner") groups.push({ title: "Team", links: [{ href: "/admin/staff", label: "Staff", icon: "users" }, { href: "/admin/audit", label: "Audit log", icon: "list" }] });
  groups.push({ title: "You", links: [{ href: "/admin/password", label: "Change password", icon: "key" }] });
  return groups;
}

async function Shell({ children }: { children: ReactNode }) {
  const staff = await requireStaff(["owner", "manager", "kitchen"]);
  return (
    <AdminShell email={staff.email} role={staff.role} groups={groupsFor(staff.role)} signOut={signOut}>
      {children}
    </AdminShell>
  );
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-5xl px-4 py-10"><div className="h-40 animate-pulse rounded-xl bg-border" /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

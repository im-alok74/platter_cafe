import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/admin/login/actions";
import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { KitchenBoard } from "./kitchen-board";

export const metadata = { title: "Kitchen", robots: { index: false, follow: false } };

async function Gate() {
  const staff = await requireStaff(["owner", "manager", "kitchen"]);
  const { data } = await (await createClient()).from("items").select("id,name,sold_out").order("name");
  return (
    <KitchenBoard
      dishes={(data ?? []).map((d) => ({ id: d.id as string, name: d.name as string, soldOut: Boolean(d.sold_out) }))}
      actions={
        <>
          {staff.role !== "kitchen" && (
            <Link href="/admin" className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-4 text-sm font-medium text-[#fbf6ef]">Admin</Link>
          )}
          {staff.role === "kitchen" && (
            <Link href="/admin" className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-4 text-sm font-medium text-[#fbf6ef]">Dashboard</Link>
          )}
          <form action={signOut}>
            <button className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-4 text-sm font-medium text-[#fbf6ef]">Sign out</button>
          </form>
        </>
      }
    />
  );
}

export default function KitchenPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#171210] p-6"><div className="h-40 animate-pulse rounded-2xl bg-white/10" /></div>}>
      <Gate />
    </Suspense>
  );
}

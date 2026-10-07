import { requireStaff } from "@/lib/admin/auth";
import { templateOf } from "@/lib/data/site";
import { createClient } from "@/lib/supabase/server";
import { DesignForm } from "./design-form";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Design" };

export default async function DesignPage() {
  await requireStaff();
  const { data, error } = await (await createClient()).from("settings").select("value").eq("key", "template").maybeSingle();
  if (error) throw new Error("Could not load the design setting.");
  const current = templateOf({ template: data?.value });
  return (
    <>
      <h1 className="mb-1 display text-4xl">Design</h1>
      <p className="mb-5 text-sm text-muted">Choose how the website looks to customers. You can switch back any time, and the change shows up straight away. Ordering works the same in both.</p>
      <DesignForm current={current} />
    </>
  );
}

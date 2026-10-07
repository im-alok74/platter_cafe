import QRCode from "qrcode";
import { env } from "@/env";
import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { TableList, type AdminTable } from "./table-list";

// Reads the signed-in session on every request, so this route is not an instant (prerendered) navigation.
export const instant = false;
export const metadata = { title: "Tables and QR codes" };

export default async function AdminTables() {
  await requireStaff();
  const { data, error } = await (await createClient()).from("benches").select("id,number,label,code,active").order("number");
  if (error) throw new Error("Could not load tables.");
  const tables: AdminTable[] = await Promise.all(
    data.map(async (t) => ({ ...t, qr: await QRCode.toDataURL(`${env.NEXT_PUBLIC_SITE_URL}/t/${t.code}`, { margin: 1, width: 192, errorCorrectionLevel: "M" }) })),
  );
  return (
    <>
      <h1 className="mb-1 display text-4xl">Tables</h1>
      <p className="mb-4 text-sm text-muted">Each table has its own QR code. Print them, or make a new one if a code leaks.</p>
      {/localhost|127\.0\.0\.1/.test(env.NEXT_PUBLIC_SITE_URL) && (
        <p role="alert" className="mb-4 rounded-xl bg-nonveg/10 p-3 text-sm text-nonveg">
          These QR codes point to {env.NEXT_PUBLIC_SITE_URL}, which only works on this computer. Set NEXT_PUBLIC_SITE_URL to the real website address before printing.
        </p>
      )}
      <TableList tables={tables} siteUrl={env.NEXT_PUBLIC_SITE_URL} />
    </>
  );
}

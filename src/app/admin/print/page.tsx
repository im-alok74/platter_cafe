import { redirect } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { env } from "@/env";
import { getStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const metadata = { title: "Print QR codes", robots: { index: false } };

async function Sheet() {
  const staff = await getStaff();
  if (!staff || staff.role === "kitchen") redirect("/admin/login");
  const { data } = await (await createClient()).from("benches").select("id,label,code").eq("active", true).order("number");
  const tables = await Promise.all((data ?? []).map(async (t) => ({ ...t, svg: await QRCode.toString(`${env.NEXT_PUBLIC_SITE_URL}/t/${t.code}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) })));
  return (
    <>
      <div className="flex items-center justify-between p-4 print:hidden">
        <p className="text-sm">{tables.length} QR cards, 6 per A4 page. Print at 100% scale.</p>
        <PrintButton />
      </div>
      <ul className="grid grid-cols-2 gap-4 p-4 print:gap-0 print:p-0">
        {tables.map((t) => (
          <li key={t.id} className="flex break-inside-avoid flex-col items-center justify-center rounded-2xl border border-dashed border-gray-400 p-6 text-center text-black print:h-[9.5cm] print:rounded-none">
            <p className="font-display text-3xl">{t.label}</p>
            <div className="my-3 h-44 w-44 bg-white [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: t.svg }} />
            <p className="text-sm">Scan to see the menu and order from your table</p>
            <p className="mt-1 font-script text-2xl text-[#b3202a]">Platter</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PrintPage() {
  return (
    <main className="min-h-svh bg-white text-black">
      <Suspense fallback={<p className="p-4">Preparing…</p>}>
        <Sheet />
      </Suspense>
    </main>
  );
}

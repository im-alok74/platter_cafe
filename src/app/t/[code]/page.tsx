import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderApp } from "@/components/order/order-app";
import { getCustomer } from "@/lib/customer";
import { getMenu } from "@/lib/data/menu";
import { getSettings } from "@/lib/data/site";
import { createPublicClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Which table a QR code is for. Cached for a minute and cleared when tables are edited, so a busy night of scans costs one lookup per table, not one per scan. */
async function benchByCode(code: string) {
  "use cache";
  cacheTag("benches");
  cacheLife("minutes");
  const { data } = await createPublicClient().rpc("get_bench", { p_code: code });
  return (data as { id: string; label: string; active: boolean } | null) ?? null;
}

// The shape check runs before the cache, so random junk in the address never creates cache entries.
const getBench = (code: string) => (/^[\w-]{4,40}$/.test(code) ? benchByCode(code) : Promise.resolve(null));

// A bad or retired QR code should not be titled like a working table.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const bench = await getBench((await params).code);
  return { title: bench ? `Order at ${bench.label}` : "Table not found" };
}

function Skeleton() {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Loading menu">
      <div className="h-14 border-b border-border" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex justify-between"><div className="h-5 w-1/2 animate-pulse rounded bg-border" /><div className="h-5 w-12 animate-pulse rounded bg-border" /></div>
        ))}
      </div>
    </div>
  );
}

async function Table({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const bench = await getBench(code);
  if (!bench) notFound();
  if (!bench.active)
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-3xl">{bench.label} is not taking orders</h1>
        <p className="mt-2 text-muted">Please ask a member of staff, or look at the menu.</p>
        <Link href="/menu" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground">See the menu</Link>
      </main>
    );
  const [categories, settings, me] = await Promise.all([getMenu(), getSettings(), getCustomer()]);
  const favourites = me ? ((await (await createClient()).from("favourites").select("item_id").eq("user_id", me.id)).data ?? []).map((f) => f.item_id) : [];
  return (
    <OrderApp
      code={code}
      tableLabel={bench.label}
      categories={categories}
      gstPercent={settings.tax.gst_percent}
      whatsapp={settings.contact.whatsapp}
      delivery={settings.delivery}
      hours={settings.hours}
      customer={me ? { id: me.id, name: me.name ?? "", phone: me.phone ? me.phone.replace(/^\+?91/, "") : "" } : null}
      favouriteIds={favourites}
    />
  );
}

export default function TablePage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Table params={params} />
    </Suspense>
  );
}

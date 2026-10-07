import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { OrderTracker } from "./order-tracker";

async function Tracker({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <OrderTracker id={id} />;
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-md px-4 py-10"><div className="h-64 animate-pulse rounded-2xl bg-border" /></div>}>
      <Tracker params={params} />
    </Suspense>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCustomer, safeNext } from "@/lib/customer";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in", robots: { index: false } };

async function Gate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCustomer()) redirect(next);
  return <LoginForm next={next} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main>
      <header className="bg-espresso text-[#fbf6ef]">
        <div className="mx-auto max-w-sm px-4 pb-9 pt-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Welcome back</p>
          <h1 className="display mt-2 text-5xl">Sign in</h1>
          <p className="mt-3 text-[#d9cbbd]">Keep your orders, favourites and rewards in one place. Ordering as a guest always works too.</p>
        </div>
      </header>
      <div className="mx-auto w-full max-w-sm px-4 py-8">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-border" />}>
            <Gate searchParams={searchParams} />
          </Suspense>
        </div>
        <Link href="/menu" className="mt-6 inline-flex min-h-11 items-center text-sm text-muted underline">Continue as a guest</Link>
      </div>
    </main>
  );
}

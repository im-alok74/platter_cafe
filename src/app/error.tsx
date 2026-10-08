"use client";
import Link from "next/link";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-muted">This page hit a problem. Try again, or head back home.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-5 flex gap-3">
        <button onClick={retry} className="min-h-11 rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground active:scale-95">
          Try again
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-border px-6 text-sm font-semibold">Home</Link>
      </div>
    </main>
  );
}

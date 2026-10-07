"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-muted">Please check your connection and try again.</p>
      <button onClick={reset} className="mt-5 min-h-11 rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground active:scale-95">
        Try again
      </button>
    </main>
  );
}

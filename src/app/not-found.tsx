import Link from "next/link";
import { Steam } from "@/components/fx/fx";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <Steam className="mb-1 h-16 w-12 text-gold" />
      <p aria-hidden className="display mb-3 text-8xl leading-none text-gold">404</p>
      <h1 className="display text-3xl">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist. The menu is a good place to start.</p>
      <Link href="/menu" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground">
        Go to the menu
      </Link>
    </main>
  );
}

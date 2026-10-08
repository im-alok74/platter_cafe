import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/wordmark";
import { getStaff } from "@/lib/admin/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Staff sign in", robots: { index: false } };

async function Gate() {
  if (await getStaff()) redirect("/admin");
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center bg-espresso px-4">
      <Link href="/" aria-label="Platter home"><Wordmark className="text-6xl !text-gold" /></Link>
      <div className="mt-6 w-full max-w-sm rounded-3xl bg-background p-6">
        <h1 className="display mb-4 text-2xl">Staff sign in</h1>
        <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-border" />}>
          <Gate />
        </Suspense>
      </div>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-[#d9cbbd] underline-offset-4 hover:underline">← Back to website</Link>
    </main>
  );
}

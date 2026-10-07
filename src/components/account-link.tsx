"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";

// A sign-in cookie means "Account"; none means "Sign in". Read in the browser so the cached pages stay the same for everyone.
const hasSession = () => document.cookie.includes("-auth-token");

export function AccountLink({ className = "" }: { className?: string }) {
  const signedIn = useSyncExternalStore(() => () => {}, hasSession, () => false);
  return (
    <Link href={signedIn ? "/account" : "/login"} prefetch={false} className={className}>
      {signedIn ? "Account" : "Sign in"}
    </Link>
  );
}

"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { btn, input } from "@/components/admin/ui";
import { register, signIn, type AuthState } from "./actions";

function Password({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="relative mt-1 block">
        <input name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={8} maxLength={72} className={`${input} pr-16`} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="absolute right-1 top-0 min-h-11 px-3 text-xs font-semibold text-brand">
          {show ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

/** Sign in or create an account with a mobile number or email and a password. */
export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [inState, inAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [regState, regAction, registering] = useActionState<AuthState, FormData>(register, {});
  const modes = ["signin", "register"] as const;
  // Arrow keys, Home and End move between the two tabs, as screen reader users expect.
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = modes.indexOf(mode);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: modes.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const m = modes[(to + modes.length) % modes.length];
    setMode(m);
    document.getElementById(`login-tab-${m}`)?.focus();
  };
  const tab = (m: typeof mode, label: string) => (
    <button type="button" role="tab" id={`login-tab-${m}`} aria-selected={mode === m} aria-controls="login-panel" tabIndex={mode === m ? 0 : -1} onClick={() => setMode(m)} onKeyDown={onTabKey} className={`min-h-11 flex-1 rounded-full text-sm font-semibold transition ${mode === m ? "bg-espresso text-[#fbf6ef]" : "text-muted"}`}>
      {label}
    </button>
  );
  return (
    <div>
      <div role="tablist" aria-label="Sign in or create an account" className="mb-5 flex gap-1 rounded-full border border-border bg-background p-1">
        {tab("signin", "Sign in")}
        {tab("register", "Create account")}
      </div>

      <div role="tabpanel" id="login-panel" aria-labelledby={`login-tab-${mode}`}>
      {mode === "signin" ? (
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => inAction(fd)); }} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-medium">
            Mobile number or email
            <input name="identifier" autoComplete="username" required autoFocus placeholder="98765 43210 or you@example.com" maxLength={120} className={`${input} mt-1`} />
          </label>
          <Password name="password" label="Password" autoComplete="current-password" />
          {inState.error && <p role="alert" className="text-sm text-nonveg">{inState.error}</p>}
          <button disabled={signingIn} className={`${btn.primary} w-full`}>{signingIn ? "Signing in…" : "Sign in"}</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => regAction(fd)); }} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-medium">
            Your name <span className="font-normal text-muted">(optional)</span>
            <input name="name" autoComplete="name" maxLength={60} className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Mobile number or email
            <input name="identifier" autoComplete="username" required placeholder="98765 43210 or you@example.com" maxLength={120} className={`${input} mt-1`} />
          </label>
          <Password name="password" label="Password (at least 8 characters)" autoComplete="new-password" />
          <Password name="confirm" label="Repeat the password" autoComplete="new-password" />
          {regState.error && <p role="alert" className="text-sm text-nonveg">{regState.error}</p>}
          <button disabled={registering} className={`${btn.primary} w-full`}>{registering ? "Creating…" : "Create account"}</button>
          <p className="text-xs text-muted">
            We keep your number or email and orders to run your account, as described in our <Link href="/privacy" className="underline">privacy policy</Link>. We only send offers if you say yes.
          </p>
        </form>
      )}
      </div>
    </div>
  );
}

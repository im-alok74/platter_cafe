"use client";
import { useSearchParams } from "next/navigation";
import { startTransition, useActionState, useState } from "react";
import { btn, input } from "@/components/admin/ui";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  const [show, setShow] = useState(false);
  const next = useSearchParams().get("next");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="username" required autoFocus className={`${input} mt-1`} />
      </label>
      <label className="block text-sm font-medium">
        Password
        <span className="relative mt-1 block">
          <input name="password" type={show ? "text" : "password"} autoComplete="current-password" required className={`${input} pr-16`} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="absolute right-1 top-0 min-h-11 px-3 text-xs font-semibold text-brand">
            {show ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      {state.error && <p role="alert" className="text-sm text-nonveg">{state.error}</p>}
      <button disabled={pending} className={`${btn.primary} w-full`}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

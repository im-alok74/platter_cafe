"use client";
import { useActionState } from "react";
import { btn, card, input } from "@/components/admin/ui";
import { changeMyPassword, type FormState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changeMyPassword, {});
  return (
    <form action={action} className={`${card} max-w-md space-y-3`}>
      <label className="block text-sm font-medium">Current password<input name="current" type="password" autoComplete="current-password" required className={`${input} mt-1`} /></label>
      <label className="block text-sm font-medium">New password (at least 8 characters)<input name="next" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={`${input} mt-1`} /></label>
      <label className="block text-sm font-medium">Repeat the new password<input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={`${input} mt-1`} /></label>
      {state.error && <p role="alert" className="text-sm text-nonveg">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-veg">Password changed.</p>}
      <button disabled={pending} className={btn.primary}>{pending ? "Changing…" : "Change password"}</button>
    </form>
  );
}

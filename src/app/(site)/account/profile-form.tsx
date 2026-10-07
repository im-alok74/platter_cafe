"use client";
import { useActionState } from "react";
import { btn, card, input } from "@/components/admin/ui";
import { changePassword, deleteAccount, signOutCustomer, updateProfile, type FormState } from "./actions";

export function ProfileForm({ name, contact, marketing }: { name: string; contact: string; marketing: boolean }) {
  const [state, action, saving] = useActionState<FormState, FormData>(updateProfile, {});
  const [pw, pwAction, changing] = useActionState<FormState, FormData>(changePassword, {});
  const [del, delAction, deleting] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <div className="space-y-6">
      <form action={action} className={`${card} space-y-4`}>
        <label className="block text-sm font-medium">Your name<input name="name" defaultValue={name} maxLength={60} autoComplete="name" className={`${input} mt-1`} placeholder="So we can greet you" /></label>
        <div className="text-sm"><span className="font-medium">{contact.includes("@") ? "Email" : "Mobile number"}</span><p className="mt-1 text-muted">{contact}</p></div>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="marketing" defaultChecked={marketing} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]" />
          <span>Send me offers and news by SMS or WhatsApp. You can turn this off any time.</span>
        </label>
        {state.error && <p role="alert" className="text-sm text-nonveg">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm text-veg">Saved.</p>}
        <button disabled={saving} className={btn.primary}>{saving ? "Saving…" : "Save"}</button>
      </form>

      <form action={pwAction} className={`${card} space-y-3`}>
        <h2 className="font-medium">Change password</h2>
        <label className="block text-sm font-medium">Current password<input name="current" type="password" autoComplete="current-password" required className={`${input} mt-1`} /></label>
        <label className="block text-sm font-medium">New password (at least 8 characters)<input name="next" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={`${input} mt-1`} /></label>
        <label className="block text-sm font-medium">Repeat the new password<input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={`${input} mt-1`} /></label>
        {pw.error && <p role="alert" className="text-sm text-nonveg">{pw.error}</p>}
        {pw.ok && <p role="status" className="text-sm text-veg">Password changed.</p>}
        <button disabled={changing} className={btn.ghost}>{changing ? "Changing…" : "Change password"}</button>
      </form>

      <form action={signOutCustomer}><button className={`${btn.ghost} w-full`}>Sign out</button></form>

      <details className={card}>
        <summary className="min-h-11 cursor-pointer font-medium leading-[2.75rem] text-nonveg">Delete my account</summary>
        <form action={delAction} className="mt-3 space-y-3">
          <p className="text-sm text-muted">This removes your profile, favourites and rewards for good. Past orders stay in the cafe&apos;s records without your name or number. This cannot be undone.</p>
          <label className="block text-sm font-medium">Type DELETE to confirm<input name="confirm" autoComplete="off" className={`${input} mt-1`} /></label>
          {del.error && <p role="alert" className="text-sm text-nonveg">{del.error}</p>}
          <button disabled={deleting} className={btn.danger}>{deleting ? "Deleting…" : "Delete my account"}</button>
        </form>
      </details>
    </div>
  );
}
